import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import { buildRuleScript, parseRuleScript, type MailRule } from '@zaur/mail-core';
import { connect, requireAccount } from '#lib/server/account';

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

/** The script this app owns. One script holds every rule, in order. */
const SCRIPT_NAME = 'zaur-rules';

export interface RulesState {
	/** False when the server does not advertise `urn:ietf:params:jmap:sieve`. */
	supported: boolean;
	rules: MailRule[];
	/**
	 * False when a filtering script exists that this app did not write. The
	 * rules editor is read-only then: someone's hand-written Sieve is not ours
	 * to silently replace.
	 */
	managed: boolean;
	/** The foreign script's source, so it can at least be read. */
	foreignScript: string | null;
	scriptId: string | null;
}

export const rules = query(async (): Promise<RulesState> => {
	const client = await connect();
	if (!client.hasSieve()) {
		return { supported: false, rules: [], managed: true, foreignScript: null, scriptId: null };
	}

	const scripts = await client.getSieveScripts();
	// Ours by name first; otherwise whatever is actually filtering mail.
	const own = scripts.find((script) => script.name === SCRIPT_NAME);
	const active = scripts.find((script) => script.isActive);
	const target = own ?? active;

	if (!target) {
		return { supported: true, rules: [], managed: true, foreignScript: null, scriptId: null };
	}

	const source = await client.getSieveScriptSource(target.blobId);
	const parsed = parseRuleScript(source);

	if (!parsed.managed) {
		return {
			supported: true,
			rules: [],
			managed: false,
			foreignScript: source,
			scriptId: target.id
		};
	}

	return {
		supported: true,
		rules: parsed.rules,
		managed: true,
		foreignScript: null,
		scriptId: target.id
	};
});

/**
 * Replace the rules.
 *
 * `takeOver` is the explicit consent to overwrite a script this app did not
 * write — without it, a foreign script is refused rather than replaced.
 */
export const saveRules = command(
	schema<{ rules: MailRule[]; takeOver?: boolean }>(),
	async ({ rules: next, takeOver }): Promise<{ count: number }> => {
		const client = await connect();
		if (!client.hasSieve()) error(501, 'This server does not support mail rules');

		const scripts = await client.getSieveScripts();
		const own = scripts.find((script) => script.name === SCRIPT_NAME);
		const active = scripts.find((script) => script.isActive);
		const target = own ?? active;

		if (target && !takeOver) {
			const source = await client.getSieveScriptSource(target.blobId);
			if (!parseRuleScript(source).managed) {
				error(409, 'A filtering script already on this account was not created here');
			}
		}

		await client.saveSieveScript({
			id: target?.id,
			name: SCRIPT_NAME,
			source: buildRuleScript(next)
		});

		return { count: next.filter((rule: MailRule) => rule.enabled).length };
	}
);
