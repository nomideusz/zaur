/**
 * Mail rules, and the Sieve they compile to.
 *
 * JMAP for Sieve (RFC 9661) stores a script as raw octets — there is no
 * structured rule object on the wire, and Sieve is a real language with
 * control flow, so parsing arbitrary scripts back into a rules UI is not
 * something to attempt. Instead the rules are the source of truth and the
 * script is generated from them, with the rules themselves carried in a
 * marker comment on the first line so the round trip is exact.
 *
 * A script without that marker was written by hand or by another client. We
 * can still show it, but we must not rewrite it — `parseRuleScript` says so
 * with `managed: false`, and the caller is expected to refuse.
 */

import { categoryKeyword, isCategoryId } from './categories.ts';

export type RuleField = 'from' | 'to' | 'cc' | 'subject';
export type RuleOperator = 'contains' | 'is' | 'startsWith' | 'endsWith';
/** The keywords the shell already understands elsewhere. */
export type RuleFlag = '\\Seen' | '\\Flagged' | '$important';

export interface RuleCondition {
	field: RuleField;
	operator: RuleOperator;
	value: string;
}

export type RuleAction =
	| { type: 'fileInto'; mailbox: string }
	| { type: 'addFlag'; flag: RuleFlag }
	/** A content category (`categories.ts`): the keyword `cat.<id>`, set at delivery. */
	| { type: 'categorize'; category: string }
	| { type: 'discard' };

export interface MailRule {
	id: string;
	name: string;
	enabled: boolean;
	/** Whether every condition has to match, or any one of them. */
	match: 'all' | 'any';
	conditions: RuleCondition[];
	actions: RuleAction[];
	/** Stop testing later rules once this one has matched. */
	stop: boolean;
}

/** The first line of a script we own. The version lets the shape change later. */
const MARKER = '# ZAUR-RULES-1 ';

const FIELD_HEADER: Record<RuleField, string> = {
	from: 'from',
	to: 'to',
	cc: 'cc',
	subject: 'subject'
};

/**
 * Sieve quoted strings escape only `\` and `"` (RFC 5228 §2.4.2). Anything
 * else, newlines included, is literal — which is exactly why the value must
 * never be concatenated in unescaped.
 */
function quote(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * `:matches` reads `*` and `?` as wildcards, so a user's own asterisk has to be
 * escaped to stay literal — and that escaping happens *before* quoting, since
 * the backslash it introduces is itself special to the quoted string.
 */
function matchPattern(value: string, shape: 'prefix' | 'suffix'): string {
	const literal = value.replace(/([*?\\])/g, '\\$1');
	return shape === 'prefix' ? `${literal}*` : `*${literal}`;
}

/**
 * `contains` reads the whole header, so a display name matches too. The
 * anchored operators read the address alone (RFC 5228 §5.1 `address`): on the
 * raw header `Ann <ann@example.com>`, "is ann@example.com" and "ends with
 * @example.com" would otherwise never match.
 */
function conditionTest(condition: RuleCondition): string {
	const header = quote(FIELD_HEADER[condition.field] ?? 'subject');
	const test = condition.field === 'subject' ? 'header' : 'address';
	switch (condition.operator) {
		case 'is':
			return `${test} :is ${header} ${quote(condition.value)}`;
		case 'startsWith':
			return `${test} :matches ${header} ${quote(matchPattern(condition.value, 'prefix'))}`;
		case 'endsWith':
			return `${test} :matches ${header} ${quote(matchPattern(condition.value, 'suffix'))}`;
		case 'contains':
		default:
			return `header :contains ${header} ${quote(condition.value)}`;
	}
}

function actionLines(action: RuleAction): string[] {
	switch (action.type) {
		case 'fileInto':
			return [`\tfileinto ${quote(action.mailbox)};`];
		case 'addFlag':
			return [`\taddflag ${quote(action.flag)};`];
		case 'categorize':
			return [`\taddflag ${quote(categoryKeyword(action.category))};`];
		case 'discard':
			return ['\tdiscard;'];
		default:
			return [];
	}
}

/** Only the extensions actually used — Stalwart rejects a require it cannot honour. */
function requiredExtensions(rules: MailRule[]): string[] {
	const needed = new Set<string>();
	for (const rule of rules) {
		if (!rule.enabled) continue;
		for (const action of rule.actions) {
			if (action.type === 'fileInto') needed.add('fileinto');
			if (action.type === 'addFlag' || action.type === 'categorize') needed.add('imap4flags');
		}
	}
	return [...needed].sort();
}

/** A rule that cannot be compiled into anything meaningful. */
export function ruleProblems(rule: MailRule): string[] {
	const problems: string[] = [];
	if (!rule.name.trim()) problems.push('Give the rule a name.');
	if (rule.conditions.length === 0) problems.push('Add at least one condition.');
	if (rule.conditions.some((condition) => !condition.value.trim())) {
		problems.push('Every condition needs something to match on.');
	}
	if (rule.actions.length === 0) problems.push('Add at least one action.');
	const discards = rule.actions.some((action) => action.type === 'discard');
	const files = rule.actions.some((action) => action.type === 'fileInto');
	if (discards && files) {
		problems.push('Deleting and filing are opposites — pick one.');
	}
	if (rule.actions.some((a) => a.type === 'fileInto' && !a.mailbox.trim())) {
		problems.push('Choose a folder to file into.');
	}
	if (rule.actions.some((a) => a.type === 'categorize' && !isCategoryId(a.category))) {
		problems.push('Choose a category.');
	}
	return problems;
}

/**
 * Compile rules to a Sieve script.
 *
 * Actions are emitted flags-first: `imap4flags` applies to whatever keeps the
 * message afterwards, so a flag set after `fileinto` would land on nothing.
 *
 * A rule with no filing and no discard leans on Sieve's *implicit keep* — the
 * message still arrives in the inbox, just flagged. `fileinto` cancels it,
 * which is what makes "file into Newsletters" move rather than copy.
 */
export function buildRuleScript(rules: MailRule[]): string {
	const lines: string[] = [MARKER + JSON.stringify(rules)];
	lines.push('# Generated by Zaur Mail. Edited by hand, it stops being editable there.');
	lines.push('');

	const extensions = requiredExtensions(rules);
	if (extensions.length > 0) {
		lines.push(`require [${extensions.map(quote).join(', ')}];`);
		lines.push('');
	}

	for (const rule of rules) {
		if (!rule.enabled) continue;
		if (ruleProblems(rule).length > 0) continue;

		const tests = rule.conditions.map(conditionTest);
		const test =
			tests.length === 1
				? tests[0]
				: `${rule.match === 'any' ? 'anyof' : 'allof'} (${tests.join(', ')})`;

		lines.push(`# ${rule.name.replace(/[\r\n]+/g, ' ')}`);
		lines.push(`if ${test} {`);
		const isFlag = (action: RuleAction) => action.type === 'addFlag' || action.type === 'categorize';
		const ordered = [...rule.actions.filter(isFlag), ...rule.actions.filter((a) => !isFlag(a))];
		for (const action of ordered) lines.push(...actionLines(action));
		if (rule.stop) lines.push('\tstop;');
		lines.push('}');
		lines.push('');
	}

	return lines.join('\n');
}

function isRuleish(value: unknown): value is MailRule {
	if (!value || typeof value !== 'object') return false;
	const rule = value as Partial<MailRule>;
	return (
		typeof rule.id === 'string' &&
		typeof rule.name === 'string' &&
		Array.isArray(rule.conditions) &&
		Array.isArray(rule.actions)
	);
}

/**
 * Read rules back out of a script.
 *
 * The content has been to a server and back, so nothing about it is trusted:
 * a malformed marker reads as an unmanaged script rather than throwing, which
 * keeps a mangled comment from locking someone out of their own rules screen.
 */
export function parseRuleScript(source: string | null | undefined): {
	rules: MailRule[];
	managed: boolean;
} {
	const text = (source ?? '').trimStart();
	if (!text.startsWith(MARKER)) return { rules: [], managed: false };

	const line = text.slice(MARKER.length).split('\n', 1)[0] ?? '';
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		return { rules: [], managed: false };
	}
	if (!Array.isArray(parsed)) return { rules: [], managed: false };

	const rules = parsed.filter(isRuleish).map((rule) => ({
		...rule,
		enabled: rule.enabled !== false,
		stop: rule.stop === true,
		match: rule.match === 'any' ? ('any' as const) : ('all' as const),
		conditions: rule.conditions.filter(
			(condition): condition is RuleCondition =>
				!!condition && typeof (condition as RuleCondition).value === 'string'
		),
		actions: rule.actions.filter(
			(action): action is RuleAction => !!action && typeof (action as RuleAction).type === 'string'
		)
	}));

	return { rules, managed: true };
}

/** A blank rule, ready to be filled in. */
export function emptyRule(id: string): MailRule {
	return {
		id,
		name: '',
		enabled: true,
		match: 'all',
		conditions: [{ field: 'from', operator: 'contains', value: '' }],
		actions: [],
		stop: true
	};
}
