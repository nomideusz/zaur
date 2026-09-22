import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	buildRuleScript,
	emptyRule,
	parseRuleScript,
	ruleProblems,
	type MailRule
} from '../src/mail/sieve-rules.ts';

function rule(overrides: Partial<MailRule> = {}): MailRule {
	return {
		id: 'r1',
		name: 'Newsletters',
		enabled: true,
		match: 'all',
		conditions: [{ field: 'from', operator: 'contains', value: 'news@example.com' }],
		actions: [{ type: 'fileInto', mailbox: 'Newsletters' }],
		stop: true,
		...overrides
	};
}

test('buildRuleScript: requires only the extensions actually used', () => {
	const flagsOnly = buildRuleScript([
		rule({ actions: [{ type: 'addFlag', flag: '$important' }] })
	]);
	assert.match(flagsOnly, /require \["imap4flags"\];/);
	assert.doesNotMatch(flagsOnly, /fileinto/);

	const both = buildRuleScript([
		rule({
			actions: [{ type: 'addFlag', flag: '\\Flagged' }, { type: 'fileInto', mailbox: 'Work' }]
		})
	]);
	assert.match(both, /require \["fileinto", "imap4flags"\];/);

	// discard and stop are core Sieve — requiring anything would be wrong.
	const core = buildRuleScript([rule({ actions: [{ type: 'discard' }] })]);
	assert.doesNotMatch(core, /require/);
});

test('buildRuleScript: flags are set before the message is filed', () => {
	// imap4flags applies to whatever keeps the message next, so a flag emitted
	// after fileinto would land on nothing.
	const script = buildRuleScript([
		rule({
			actions: [{ type: 'fileInto', mailbox: 'Work' }, { type: 'addFlag', flag: '$important' }]
		})
	]);
	// Compare the action lines, not the whole script — `require ["fileinto", …]`
	// mentions fileinto first and would make a naive indexOf always pass.
	const body = script.split('\n').filter((line) => line.startsWith('\t'));
	assert.deepEqual(body, ['\taddflag "$important";', '\tfileinto "Work";', '\tstop;']);
});

test('buildRuleScript: one condition needs no allof wrapper, several do', () => {
	assert.match(buildRuleScript([rule()]), /if header :contains "from" "news@example\.com" \{/);

	const many = buildRuleScript([
		rule({
			match: 'any',
			conditions: [
				{ field: 'from', operator: 'contains', value: 'a@b.c' },
				{ field: 'subject', operator: 'is', value: 'Hello' }
			]
		})
	]);
	assert.match(many, /anyof \(header :contains "from" "a@b\.c", header :is "subject" "Hello"\)/);
});

test('buildRuleScript: quotes are escaped, not concatenated in', () => {
	const script = buildRuleScript([
		rule({ conditions: [{ field: 'subject', operator: 'is', value: 'say "hi" \\ bye' }] })
	]);
	assert.match(script, /header :is "subject" "say \\"hi\\" \\\\ bye"/);
});

test('buildRuleScript: a literal asterisk survives a startsWith match', () => {
	// :matches reads * and ? as wildcards; the user's own ones must stay literal,
	// and the escaping backslash then has to survive Sieve quoting too.
	const script = buildRuleScript([
		rule({ conditions: [{ field: 'subject', operator: 'startsWith', value: '[50% off*]' }] })
	]);
	assert.match(script, /header :matches "subject" "\[50% off\\\\\*\]\*"/);
});

test('buildRuleScript: endsWith anchors on the other side', () => {
	const script = buildRuleScript([
		rule({ conditions: [{ field: 'from', operator: 'endsWith', value: '@example.com' }] })
	]);
	assert.match(script, /header :matches "from" "\*@example\.com"/);
});

test('buildRuleScript: disabled and unfinished rules compile to nothing', () => {
	const script = buildRuleScript([
		rule({ id: 'off', name: 'Off', enabled: false }),
		rule({ id: 'broken', name: 'Broken', conditions: [] })
	]);
	assert.doesNotMatch(script, /if /);
	// …but they are still carried, so editing them is not a one-way trip.
	assert.equal(parseRuleScript(script).rules.length, 2);
});

test('rules survive the round trip through a script exactly', () => {
	const rules = [
		rule(),
		rule({
			id: 'r2',
			name: 'From the boss',
			match: 'any',
			conditions: [
				{ field: 'from', operator: 'is', value: 'boss@example.com' },
				{ field: 'subject', operator: 'startsWith', value: 'URGENT' }
			],
			actions: [{ type: 'addFlag', flag: '$important' }],
			stop: false
		})
	];
	const parsed = parseRuleScript(buildRuleScript(rules));
	assert.equal(parsed.managed, true);
	assert.deepEqual(parsed.rules, rules);
});

test('parseRuleScript: a script we did not write is never ours to rewrite', () => {
	const handWritten = 'require ["fileinto"];\nif header :contains "from" "x" { fileinto "Y"; }';
	assert.deepEqual(parseRuleScript(handWritten), { rules: [], managed: false });
});

test('parseRuleScript: a mangled marker reads as unmanaged, not as a crash', () => {
	// It has been to a server and back; a broken comment must not lock anyone
	// out of their own rules screen.
	for (const bad of [
		'# ZAUR-RULES-1 {not json',
		'# ZAUR-RULES-1 {"not":"an array"}',
		'# ZAUR-RULES-1 ',
		'',
		null,
		undefined
	]) {
		const parsed = parseRuleScript(bad as string);
		assert.deepEqual(parsed, { rules: [], managed: false }, `for ${JSON.stringify(bad)}`);
	}
});

test('parseRuleScript: entries that are not rules are dropped, the rest survive', () => {
	const source = `# ZAUR-RULES-1 ${JSON.stringify([
		{ nope: true },
		null,
		'string',
		{ id: 'r1', name: 'Keep', conditions: [], actions: [] }
	])}`;
	const parsed = parseRuleScript(source);
	assert.equal(parsed.managed, true);
	assert.equal(parsed.rules.length, 1);
	assert.equal(parsed.rules[0]!.id, 'r1');
	// Defaults are filled in rather than left undefined.
	assert.equal(parsed.rules[0]!.enabled, true);
	assert.equal(parsed.rules[0]!.match, 'all');
	assert.equal(parsed.rules[0]!.stop, false);
});

test('parseRuleScript: a name with a newline cannot forge a second marker line', () => {
	const script = buildRuleScript([rule({ name: 'Evil\n# ZAUR-RULES-1 []' })]);
	// JSON.stringify escapes the newline, so the marker stays one line…
	assert.equal(script.split('\n')[0]!.includes('Evil\\n'), true);
	// …and the comment the generator writes cannot break out either.
	assert.match(script, /# Evil # ZAUR-RULES-1 \[\]/);
	assert.equal(parseRuleScript(script).rules[0]!.name, 'Evil\n# ZAUR-RULES-1 []');
});

test('ruleProblems: catches the ways a rule cannot compile', () => {
	assert.deepEqual(ruleProblems(rule()), []);
	assert.ok(ruleProblems(rule({ name: '  ' })).length > 0);
	assert.ok(ruleProblems(rule({ conditions: [] })).length > 0);
	assert.ok(ruleProblems(rule({ actions: [] })).length > 0);
	assert.ok(
		ruleProblems(
			rule({ conditions: [{ field: 'from', operator: 'contains', value: '   ' }] })
		).length > 0
	);
	assert.ok(
		ruleProblems(
			rule({ actions: [{ type: 'fileInto', mailbox: 'X' }, { type: 'discard' }] })
		).some((problem) => problem.includes('opposites'))
	);
	assert.ok(
		ruleProblems(rule({ actions: [{ type: 'fileInto', mailbox: '' }] })).length > 0
	);
});

test('emptyRule: starts valid enough to edit, not valid enough to compile', () => {
	const blank = emptyRule('new-1');
	assert.equal(blank.id, 'new-1');
	assert.ok(ruleProblems(blank).length > 0);
	assert.equal(buildRuleScript([blank]).includes('if '), false);
});

test('categorize action: addflag cat.<id>, round-trips, validated', () => {
	const rules = [rule({ actions: [{ type: 'categorize', category: 'receipts' }] })];
	const script = buildRuleScript(rules);
	assert.match(script, /require \["imap4flags"\];/);
	assert.match(script, /addflag "cat\.receipts";/);
	assert.deepEqual(parseRuleScript(script).rules[0].actions, rules[0].actions);
	assert.ok(ruleProblems(rule({ actions: [{ type: 'categorize', category: 'nope' }] })).length);
});
