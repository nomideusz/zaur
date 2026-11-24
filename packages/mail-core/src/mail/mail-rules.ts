/**
 * Mail rules as Stalwart stores them (`x:MailRule`, Stalwart 1.2 and later),
 * and the mapping to the rules the webmail edits.
 *
 * Why not our own Sieve script any more: Stalwart 1.2 compiles the account's
 * rules, its blocked and safe senders and its vacation response into one
 * read-only script named `managed`, and makes that script the active one
 * whenever any of them changes. Only one script runs at a time, so a script of
 * our own and the auto-reply switched each other off. Rules kept as
 * `x:MailRule` live in that same script, next to the auto-reply.
 *
 * The mapping is exact in both directions for everything the editor can make.
 * A server rule the editor cannot show faithfully (one made in Stalwart's
 * WebUI or by Outlook, with conditions or actions the editor has no control
 * for) maps to `null`: it is listed as kept, and never rewritten from here.
 */

import { categoryKeyword, isCategoryId } from './categories.ts';
import type { MailRule, RuleAction, RuleCondition, RuleField, RuleFlag } from './sieve-rules.ts';

/** One test of a rule: `@type` names it, the rest depends on the type. */
export interface ServerRuleTest {
	'@type': string;
	operator?: string;
	values?: Record<string, boolean>;
	header?: string;
	[key: string]: unknown;
}

/** Stalwart sends lists as objects keyed by index; arrays are accepted on read too. */
export type ServerRuleTests = Record<string, ServerRuleTest> | ServerRuleTest[];

export interface ServerRuleActions {
	addKeywords?: Record<string, boolean>;
	removeKeywords?: Record<string, boolean>;
	clearKeywords?: boolean;
	setImportance?: string | null;
	redirect?: unknown;
	reply?: unknown;
	copyTo?: Record<string, boolean>;
	moveTo?: Record<string, boolean>;
	discard?: boolean;
	reject?: unknown;
	stopProcessing?: boolean;
}

export interface ServerMailRule {
	id?: string;
	name: string;
	isEnabled?: boolean;
	position?: number;
	conditions: {
		matchAll?: ServerRuleTests;
		matchAny?: ServerRuleTests;
		matchNone?: ServerRuleTests;
	};
	actions: ServerRuleActions;
}

const ADDRESS_TYPE: Record<Exclude<RuleField, 'subject'>, string> = {
	from: 'From',
	to: 'To',
	cc: 'Cc'
};

const FLAG_KEYWORD: Record<RuleFlag, string> = {
	'\\Seen': '$seen',
	'\\Flagged': '$flagged',
	$important: '$important'
};

const KEYWORD_FLAG: Record<string, RuleFlag> = {
	$seen: '\\Seen',
	$flagged: '\\Flagged',
	$important: '$important'
};

/** `matches` reads `*` and `?` as wildcards: a user's own stays literal escaped. */
function escapeWildcards(value: string): string {
	return value.replace(/([*?\\])/g, '\\$1');
}

/**
 * The literal text of a pattern, if the pattern is that text plus one
 * unescaped `*` at the given end and no other wildcard. Anything else is a
 * pattern the editor cannot show.
 */
function literalOf(pattern: string, shape: 'prefix' | 'suffix'): string | null {
	const tokens: { char: string; wild: boolean }[] = [];
	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i]!;
		if (char === '\\') {
			const next = pattern[i + 1];
			if (next === undefined) return null;
			tokens.push({ char: next, wild: false });
			i++;
		} else {
			tokens.push({ char, wild: char === '*' || char === '?' });
		}
	}
	const edge = shape === 'prefix' ? tokens.pop() : tokens.shift();
	if (!edge || !edge.wild || edge.char !== '*') return null;
	if (tokens.length === 0 || tokens.some((token) => token.wild)) return null;
	return tokens.map((token) => token.char).join('');
}

function single(values: Record<string, boolean> | undefined): string | null {
	const on = Object.entries(values ?? {}).filter(([, set]) => set);
	return on.length === 1 ? on[0]![0] : null;
}

function listOf(tests: ServerRuleTests | undefined): ServerRuleTest[] {
	if (!tests) return [];
	if (Array.isArray(tests)) return tests;
	return Object.keys(tests)
		.sort((a, b) => Number(a) - Number(b))
		.map((key) => tests[key]!);
}

/**
 * `contains` on an address field reads the whole header, display name
 * included, exactly as the Sieve this replaces did (`header :contains`): that
 * is what lets "from contains Ann" catch `Ann <a@example.com>`. Stalwart's
 * address `contains` reads only the address, so it goes out as a Header test.
 * The anchored operators read the address alone, as before.
 */
export function toServerTest(condition: RuleCondition): ServerRuleTest {
	const value = condition.value;
	if (condition.field === 'subject') {
		switch (condition.operator) {
			case 'is':
				return { '@type': 'Subject', operator: 'is', values: { [value]: true } };
			case 'startsWith':
				return { '@type': 'Subject', operator: 'matches', values: { [`${escapeWildcards(value)}*`]: true } };
			case 'endsWith':
				return { '@type': 'Subject', operator: 'matches', values: { [`*${escapeWildcards(value)}`]: true } };
			default:
				return { '@type': 'Subject', operator: 'contains', values: { [value]: true } };
		}
	}
	const type = ADDRESS_TYPE[condition.field] ?? 'From';
	switch (condition.operator) {
		case 'is':
			return { '@type': type, operator: 'is', values: { [value]: true } };
		case 'startsWith':
			return { '@type': type, operator: 'matches', values: { [`${escapeWildcards(value)}*`]: true } };
		case 'endsWith':
			return { '@type': type, operator: 'matches', values: { [`*${escapeWildcards(value)}`]: true } };
		default:
			return { '@type': 'Header', header: type, operator: 'contains', values: { [value]: true } };
	}
}

export function fromServerTest(test: ServerRuleTest): RuleCondition | null {
	const value = single(test.values);
	if (value === null) return null;
	const type = test['@type'];

	if (type === 'Header') {
		if ((test.operator ?? 'contains') !== 'contains') return null;
		const header = String(test.header ?? '').toLowerCase();
		if (header === 'subject') return { field: 'subject', operator: 'contains', value };
		if (header === 'from' || header === 'to' || header === 'cc') {
			return { field: header, operator: 'contains', value };
		}
		return null;
	}

	const field = (
		{ Subject: 'subject', From: 'from', To: 'to', Cc: 'cc' } as Record<string, RuleField>
	)[type];
	if (!field) return null;
	// Stalwart's defaults: text tests contain, address tests are exact.
	const operator = test.operator ?? (field === 'subject' ? 'contains' : 'is');

	if (operator === 'is') return { field, operator: 'is', value };
	if (operator === 'contains') {
		// Address `contains` reads the address only — not what this editor means by it.
		return field === 'subject' ? { field, operator: 'contains', value } : null;
	}
	if (operator === 'matches') {
		const prefix = literalOf(value, 'prefix');
		if (prefix !== null) return { field, operator: 'startsWith', value: prefix };
		const suffix = literalOf(value, 'suffix');
		if (suffix !== null) return { field, operator: 'endsWith', value: suffix };
	}
	return null;
}

export function toServerActions(
	actions: RuleAction[],
	stop: boolean,
	mailboxId: (name: string) => string | undefined
): ServerRuleActions {
	const addKeywords: Record<string, boolean> = {};
	const moveTo: Record<string, boolean> = {};
	let discard = false;
	for (const action of actions) {
		if (action.type === 'addFlag') addKeywords[FLAG_KEYWORD[action.flag]] = true;
		else if (action.type === 'categorize') addKeywords[categoryKeyword(action.category)] = true;
		else if (action.type === 'discard') discard = true;
		else if (action.type === 'fileInto') {
			const id = mailboxId(action.mailbox);
			if (!id) throw new Error(`There is no folder called “${action.mailbox}” any more`);
			moveTo[id] = true;
		}
	}
	return { addKeywords, moveTo, discard, stopProcessing: stop };
}

export function fromServerActions(
	actions: ServerRuleActions,
	mailboxName: (id: string) => string | undefined
): RuleAction[] | null {
	const has = (set: Record<string, boolean> | undefined) => Object.values(set ?? {}).some(Boolean);
	if (
		has(actions.removeKeywords) ||
		has(actions.copyTo) ||
		actions.clearKeywords ||
		actions.setImportance ||
		actions.redirect ||
		actions.reply ||
		actions.reject
	) {
		return null;
	}

	const flags: RuleAction[] = [];
	const categories: RuleAction[] = [];
	for (const [keyword, on] of Object.entries(actions.addKeywords ?? {})) {
		if (!on) continue;
		const lower = keyword.toLowerCase();
		const flag = KEYWORD_FLAG[lower];
		if (flag) {
			flags.push({ type: 'addFlag', flag });
			continue;
		}
		const category = lower.startsWith('cat.') ? lower.slice(4) : null;
		if (category && isCategoryId(category) && categoryKeyword(category) === lower) {
			categories.push({ type: 'categorize', category });
			continue;
		}
		return null;
	}

	const filing: RuleAction[] = [];
	for (const [id, on] of Object.entries(actions.moveTo ?? {})) {
		if (!on) continue;
		const name = mailboxName(id);
		if (!name) return null;
		filing.push({ type: 'fileInto', mailbox: name });
	}

	const discard: RuleAction[] = actions.discard ? [{ type: 'discard' }] : [];
	return [...flags, ...categories, ...filing, ...discard];
}

/** A rule as `x:MailRule/set` takes it. The rule must have no `ruleProblems`. */
export function toServerRule(
	rule: MailRule,
	position: number,
	mailboxId: (name: string) => string | undefined
): ServerMailRule {
	const tests: Record<string, ServerRuleTest> = {};
	rule.conditions.forEach((condition, index) => {
		tests[String(index)] = toServerTest(condition);
	});
	return {
		name: rule.name.trim(),
		isEnabled: rule.enabled,
		position,
		conditions: {
			matchAll: rule.match === 'all' ? tests : {},
			matchAny: rule.match === 'any' ? tests : {},
			matchNone: {}
		},
		actions: toServerActions(rule.actions, rule.stop, mailboxId)
	};
}

/** The editor's rule for a server rule, or `null` when the editor cannot show it faithfully. */
export function fromServerRule(
	rule: ServerMailRule,
	mailboxName: (id: string) => string | undefined
): MailRule | null {
	if (!rule.id) return null;
	const all = listOf(rule.conditions?.matchAll);
	const any = listOf(rule.conditions?.matchAny);
	if (listOf(rule.conditions?.matchNone).length > 0) return null;
	if (all.length > 0 && any.length > 0) return null;
	const tests = all.length > 0 ? all : any;
	if (tests.length === 0) return null;

	const conditions: RuleCondition[] = [];
	for (const test of tests) {
		const condition = fromServerTest(test);
		if (!condition) return null;
		conditions.push(condition);
	}

	const actions = fromServerActions(rule.actions ?? {}, mailboxName);
	if (!actions || actions.length === 0) return null;

	return {
		id: rule.id,
		name: rule.name,
		enabled: rule.isEnabled !== false,
		match: all.length > 0 ? 'all' : 'any',
		conditions,
		actions,
		stop: rule.actions?.stopProcessing === true
	};
}

/** Server rules in the order they run: by position, then as created. */
export function sortServerRules<T extends ServerMailRule>(rules: T[]): T[] {
	return rules
		.map((rule, index) => ({ rule, index }))
		.sort((a, b) => (a.rule.position ?? 0) - (b.rule.position ?? 0) || a.index - b.index)
		.map(({ rule }) => rule);
}

/**
 * What one `x:MailRule/set` has to do to make the server hold `next`.
 *
 * `editable` are the ids of the server rules the editor was shown. Only those
 * are updated or destroyed: rules the editor could not show are never
 * touched. Positions follow the editor's order.
 */
export function planRuleSave(
	next: MailRule[],
	editable: Set<string>,
	mailboxId: (name: string) => string | undefined
): {
	create: Record<string, ServerMailRule>;
	update: Record<string, ServerMailRule>;
	destroy: string[];
} {
	const create: Record<string, ServerMailRule> = {};
	const update: Record<string, ServerMailRule> = {};
	const kept = new Set<string>();
	next.forEach((rule, index) => {
		const server = toServerRule(rule, index, mailboxId);
		if (editable.has(rule.id) && !kept.has(rule.id)) {
			update[rule.id] = server;
			kept.add(rule.id);
		} else {
			create[`new${index}`] = server;
		}
	});
	const destroy = [...editable].filter((id) => !kept.has(id));
	return { create, update, destroy };
}
