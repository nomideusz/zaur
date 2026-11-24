/**
 * Mail rules on the server: Stalwart's `x:MailRule`, and the move off the
 * Sieve script mail2 used to write.
 *
 * Until Stalwart 1.2 the rules were a script of our own, `zaur-rules`. Stalwart
 * 1.2 keeps the auto-reply (and blocked and safe senders) in a read-only
 * script named `managed` and activates it whenever one of them changes; one
 * script runs at a time, so turning the auto-reply on switched the rules off,
 * and saving the rules switched the auto-reply off. Rules kept as
 * `x:MailRule` are compiled into `managed` with the auto-reply, so both run.
 *
 * `moveLegacyRules` turns an old `zaur-rules` script into `x:MailRule` rules,
 * once, the first time the account's rules or auto-reply are opened or saved.
 * The old script is renamed and switched off, never deleted.
 */

import {
	parseRuleScript,
	ruleProblems,
	toServerRule,
	type JMAPClient,
	type ServerMailRule
} from '@zaur/mail-core';

/** The script mail2 wrote before Stalwart 1.2. */
export const LEGACY_SCRIPT = 'zaur-rules';
/** What it is renamed to once its rules are moved. */
const RETIRED_SCRIPT = 'zaur-rules-moved';
/** Stalwart's own script: rules, sender lists and the auto-reply. */
const MANAGED_SCRIPT = 'managed';

/**
 * A script that runs the rules where it says `include "managed"` (RFC 6609).
 * Stalwart leaves such a script active when rules change, so it is no one's
 * to take over. The include has to name the script literally and as a
 * personal one, as Stalwart only recognises that form.
 */
const INCLUDES_MANAGED = /\binclude\s+(?::personal\s+)?(?::optional\s+)?(?::once\s+)?"managed"/;

export interface MailboxIndex {
	id: (name: string) => string | undefined;
	name: (id: string) => string | undefined;
}

/** Folder names to ids and back. Rules name a folder; the server keeps its id. */
export async function mailboxIndex(client: JMAPClient): Promise<MailboxIndex> {
	const list = await client.getMailboxes();
	const names = new Map(list.map((box) => [box.id, box.name]));
	return {
		name: (id) => names.get(id),
		id: (name) =>
			list.find((box) => box.name === name)?.id ??
			list.find((box) => box.name.toLowerCase() === name.toLowerCase())?.id ??
			(name.toUpperCase() === 'INBOX' ? list.find((box) => box.role === 'inbox')?.id : undefined)
	};
}

/**
 * The hand-written script that is filtering mail, if there is one. Saving
 * rules makes Stalwart run its own script instead, which switches this one
 * off — so the editor asks first.
 */
export async function foreignFilter(client: JMAPClient): Promise<{ id: string; source: string } | null> {
	if (!client.hasSieve()) return null;
	const active = (await client.getSieveScripts()).find((script) => script.isActive);
	if (!active || active.name === MANAGED_SCRIPT) return null;
	const source = await client.getSieveScriptSource(active.blobId);
	if (INCLUDES_MANAGED.test(source)) return null;
	return { id: active.id, source };
}

/** After a take-over: run Stalwart's script if it exists, else nothing. */
export async function runManagedScript(client: JMAPClient): Promise<void> {
	const managed = (await client.getSieveScripts()).find((script) => script.name === MANAGED_SCRIPT);
	await client.activateSieveScript(managed?.id ?? null);
}

const moving = new Map<string, Promise<void>>();

/**
 * Move the rules of an old `zaur-rules` script into `x:MailRule`, once.
 *
 * Only a script that still carries the marker line is ours to move; one
 * edited by hand is someone's own Sieve and is left alone. Rules that were
 * not finished never ran, and a rule filing into a folder that is gone
 * cannot be saved; both stay in the renamed script rather than being made up.
 *
 * The auto-reply keeps the state the account shows now. While the rules
 * script was active, Stalwart reported the auto-reply as off even when it had
 * been turned on; running the rules from `managed` would start sending it
 * again, possibly long after it was meant.
 */
export function moveLegacyRules(client: JMAPClient): Promise<void> {
	if (!client.hasMailRules() || !client.hasSieve()) return Promise.resolve();
	const key = `${client.getUsername()}/${client.getAccountId()}`;
	const running = moving.get(key);
	if (running) return running;
	const job = move(client).finally(() => moving.delete(key));
	moving.set(key, job);
	return job;
}

async function move(client: JMAPClient): Promise<void> {
	const scripts = await client.getSieveScripts();
	const legacy = scripts.find((script) => script.name === LEGACY_SCRIPT);
	if (!legacy) return;
	const parsed = parseRuleScript(await client.getSieveScriptSource(legacy.blobId));
	if (!parsed.managed) return;

	const autoReplyShown = client.hasVacationResponse()
		? ((await client.getVacationResponse())?.isEnabled ?? false)
		: false;

	const [boxes, existing] = await Promise.all([mailboxIndex(client), client.getMailRules()]);
	const start = existing.reduce((next, rule) => Math.max(next, (rule.position ?? 0) + 1), 0);
	const create: Record<string, ServerMailRule> = {};
	const left: string[] = [];
	parsed.rules.forEach((rule, index) => {
		if (ruleProblems(rule).length > 0) return void left.push(rule.name || '(unnamed)');
		try {
			create[`moved${index}`] = toServerRule(rule, start + index, boxes.id);
		} catch {
			left.push(rule.name);
		}
	});

	if (Object.keys(create).length > 0) {
		const { created, failures } = await client.setMailRules({ create });
		if (failures.length > 0) {
			// Half a move would be repeated on the next try: take it back.
			const ids = Object.values(created);
			if (ids.length > 0) await client.setMailRules({ destroy: ids }).catch(() => {});
			throw new Error(`Your rules could not be moved to the server's mail rules: ${failures[0]}`);
		}
	}

	const now = await client.getSieveScripts();
	const taken = new Set(now.map((script) => script.name));
	const name = taken.has(RETIRED_SCRIPT) ? `${RETIRED_SCRIPT}-${Date.now().toString(36)}` : RETIRED_SCRIPT;
	const stillActive = now.find((script) => script.id === legacy.id)?.isActive ?? false;
	await client.retireSieveScript(legacy.id, name, stillActive);

	if (!autoReplyShown && client.hasVacationResponse()) {
		const after = await client.getVacationResponse();
		if (after?.isEnabled) await client.setVacationResponse({ isEnabled: false });
	}

	if (left.length > 0) {
		console.warn(`[rules] ${client.getUsername()}: not moved, kept in script ${name}:`, left);
	}
}
