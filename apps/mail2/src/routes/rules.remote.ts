import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import {
	fromServerRule,
	planRuleSave,
	ruleProblems,
	sortServerRules,
	type MailRule
} from '@zaur/mail-core';
import { connect } from '#lib/server/account';
import { foreignFilter, mailboxIndex, moveLegacyRules, runManagedScript } from '#lib/server/mail-rules';

function schema<T>() {
	return {
		'~standard': {
			version: 1,
			vendor: 'zaur',
			validate(value: unknown) {
				return { value: value as T };
			}
		}
	} as any;
}

export interface RulesState {
	/** False when the server has no mail rules (`x:MailRule`, Stalwart 1.2 and later). */
	supported: boolean;
	rules: MailRule[];
	/**
	 * False when a hand-written Sieve script is filtering mail. Saving rules
	 * makes the server run its own script instead, which switches that one off,
	 * so the editor stays read-only until the person says to go ahead.
	 */
	managed: boolean;
	/** The hand-written script's source, so it can at least be read. */
	foreignScript: string | null;
	/**
	 * Rules made somewhere else (Stalwart's web admin, Outlook) that this editor
	 * cannot show faithfully. They run, and saving here leaves them as they are.
	 */
	kept: string[];
}

const UNSUPPORTED: RulesState = { supported: false, rules: [], managed: true, foreignScript: null, kept: [] };

/** The server's rules, split into the ones the editor shows and the ones it keeps. */
async function load(client: Awaited<ReturnType<typeof connect>>) {
	const [serverRules, boxes] = await Promise.all([client.getMailRules(), mailboxIndex(client)]);
	const shown: MailRule[] = [];
	const kept: string[] = [];
	for (const server of sortServerRules(serverRules)) {
		const rule = fromServerRule(server, boxes.name);
		if (rule) shown.push(rule);
		else kept.push(server.name);
	}
	return { shown, kept, boxes };
}

function unsupported(cause: unknown): boolean {
	const type = (cause as { type?: string } | null)?.type;
	return type === 'unknownMethod' || type === 'forbidden' || type === 'unknownCapability';
}

export const rules = query(async (): Promise<RulesState> => {
	const client = await connect();
	if (!client.hasMailRules()) return UNSUPPORTED;
	try {
		await moveLegacyRules(client);
		const [{ shown, kept }, foreign] = await Promise.all([load(client), foreignFilter(client)]);
		return {
			supported: true,
			rules: shown,
			managed: !foreign,
			foreignScript: foreign?.source ?? null,
			kept
		};
	} catch (cause) {
		if (unsupported(cause)) return UNSUPPORTED;
		throw cause;
	}
});

/**
 * Replace the rules this editor shows. Rules it cannot show are left alone.
 *
 * `takeOver` is the explicit consent to switch off a hand-written script that
 * is filtering mail — without it, saving is refused rather than doing that.
 */
export const saveRules = command(
	schema<{ rules: MailRule[]; takeOver?: boolean }>(),
	async ({ rules: next, takeOver }): Promise<{ count: number }> => {
		const list: MailRule[] = Array.isArray(next) ? next : [];
		for (const rule of list) {
			const problem = ruleProblems(rule)[0];
			if (problem) error(400, `“${rule.name.trim() || 'A rule'}” is not finished: ${problem}`);
		}

		const client = await connect();
		if (!client.hasMailRules()) error(501, 'This server does not support mail rules');
		await moveLegacyRules(client).catch((cause: unknown) => error(502, String((cause as Error)?.message ?? cause)));

		const foreign = await foreignFilter(client);
		if (foreign && !takeOver) {
			error(409, 'A filtering script already on this account was not created here');
		}

		const { shown, boxes } = await load(client);
		let plan: ReturnType<typeof planRuleSave>;
		try {
			plan = planRuleSave(list, new Set(shown.map((rule) => rule.id)), boxes.id);
		} catch (cause) {
			error(400, (cause as Error).message);
		}

		const { failures } = await client
			.setMailRules(plan)
			.catch(() => error(502, 'The server did not accept these rules. Nothing was saved.'));
		if (failures.length > 0) error(502, `The server did not accept these rules: ${failures[0]}`);

		if (foreign) await runManagedScript(client);

		return { count: list.filter((rule) => rule.enabled).length };
	}
);
