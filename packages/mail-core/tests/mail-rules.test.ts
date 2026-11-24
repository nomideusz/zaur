import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	fromServerRule,
	fromServerTest,
	planRuleSave,
	sortServerRules,
	toServerRule,
	toServerTest,
	type ServerMailRule
} from '../src/mail/mail-rules.ts';
import type { MailRule } from '../src/mail/sieve-rules.ts';

const boxes: Record<string, string> = { m1: 'Newsletters', m2: 'Archive' };
const mailboxId = (name: string) => Object.keys(boxes).find((id) => boxes[id] === name);
const mailboxName = (id: string) => boxes[id];

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

/** What the server hands back: the rule with its id, lists keyed by index. */
function roundTrip(input: MailRule): MailRule | null {
	return fromServerRule({ ...toServerRule(input, 0, mailboxId), id: input.id }, mailboxName);
}

test('every condition the editor can make survives the round trip', () => {
	for (const field of ['from', 'to', 'cc', 'subject'] as const) {
		for (const operator of ['contains', 'is', 'startsWith', 'endsWith'] as const) {
			for (const value of ['ann', 'a*b?c', 'back\\slash', 'quote"d', '*']) {
				const input = rule({ conditions: [{ field, operator, value }] });
				assert.deepEqual(roundTrip(input), input, `${field} ${operator} ${value}`);
			}
		}
	}
});

test('every action, any match and flags survive the round trip', () => {
	const input = rule({
		match: 'any',
		enabled: false,
		stop: false,
		conditions: [
			{ field: 'subject', operator: 'contains', value: 'unsubscribe' },
			{ field: 'from', operator: 'endsWith', value: '@example.com' }
		],
		actions: [
			{ type: 'addFlag', flag: '\\Seen' },
			{ type: 'addFlag', flag: '\\Flagged' },
			{ type: 'addFlag', flag: '$important' },
			{ type: 'categorize', category: 'newsletters' },
			{ type: 'fileInto', mailbox: 'Archive' }
		]
	});
	assert.deepEqual(roundTrip(input), input);
	assert.deepEqual(roundTrip(rule({ actions: [{ type: 'discard' }] }))?.actions, [{ type: 'discard' }]);
});

test('address contains reads the whole header, display name included', () => {
	assert.deepEqual(toServerTest({ field: 'from', operator: 'contains', value: 'Ann' }), {
		'@type': 'Header',
		header: 'From',
		operator: 'contains',
		values: { Ann: true }
	});
	// The server's own address `contains` reads the address alone: not ours to edit.
	assert.equal(fromServerTest({ '@type': 'From', operator: 'contains', values: { ann: true } }), null);
});

test('wildcards in a value stay literal', () => {
	const test1 = toServerTest({ field: 'subject', operator: 'startsWith', value: 'a*b' });
	assert.deepEqual(test1.values, { 'a\\*b*': true });
	const test2 = toServerTest({ field: 'to', operator: 'endsWith', value: '\\x' });
	assert.deepEqual(test2.values, { '*\\\\x': true });
	// Patterns the editor cannot express are not mistaken for a prefix or suffix.
	for (const pattern of ['a*b*', '*a*', 'a?*', 'abc\\*', '*', '**']) {
		assert.equal(fromServerTest({ '@type': 'Subject', operator: 'matches', values: { [pattern]: true } }), null, pattern);
	}
});

test('rules made elsewhere that the editor cannot show map to null', () => {
	const base = { ...toServerRule(rule(), 0, mailboxId), id: 'x' };
	const variants: ServerMailRule[] = [
		{ ...base, conditions: { ...base.conditions, matchNone: { 0: { '@type': 'HasAttachment' } } } },
		{ ...base, conditions: { matchAll: { 0: { '@type': 'SpamScore', percent: 50 } } } },
		{ ...base, conditions: { matchAll: { 0: { '@type': 'Subject', values: { a: true, b: true } } } } },
		{ ...base, conditions: { matchAll: {}, matchAny: {} } },
		{ ...base, actions: { ...base.actions, redirect: { addresses: { 'a@b.c': true } } } },
		{ ...base, actions: { ...base.actions, copyTo: { m1: true } } },
		{ ...base, actions: { addKeywords: { custom: true } } },
		{ ...base, actions: { moveTo: { gone: true } } },
		{ ...base, actions: { stopProcessing: true } }
	];
	for (const variant of variants) assert.equal(fromServerRule(variant, mailboxName), null, JSON.stringify(variant));
});

test('arrays are read as well as index-keyed objects', () => {
	const server = toServerRule(rule(), 0, mailboxId);
	const asArray = {
		...server,
		id: 'r1',
		conditions: { matchAll: Object.values(server.conditions.matchAll as object), matchAny: [], matchNone: [] }
	};
	assert.deepEqual(fromServerRule(asArray as ServerMailRule, mailboxName), rule());
});

test('filing into a folder that no longer exists is refused before saving', () => {
	assert.throws(() => toServerRule(rule({ actions: [{ type: 'fileInto', mailbox: 'Gone' }] }), 0, mailboxId), /Gone/);
});

test('planRuleSave updates shown rules, creates new ones and leaves the rest alone', () => {
	const plan = planRuleSave(
		[rule({ id: 'b' }), rule({ id: 'r-new', name: 'New' }), rule({ id: 'b', name: 'Duplicate id' })],
		new Set(['a', 'b']),
		mailboxId
	);
	assert.deepEqual(Object.keys(plan.update), ['b']);
	assert.equal(plan.update.b!.position, 0);
	assert.deepEqual(Object.keys(plan.create), ['new1', 'new2']);
	assert.equal(plan.create.new1!.position, 1);
	assert.deepEqual(plan.destroy, ['a']);
});

test('sortServerRules orders by position, then as created', () => {
	const rules = [
		{ id: 'c', name: 'c', position: 2, conditions: {}, actions: {} },
		{ id: 'a', name: 'a', position: 0, conditions: {}, actions: {} },
		{ id: 'b', name: 'b', position: 0, conditions: {}, actions: {} }
	];
	assert.deepEqual(sortServerRules(rules).map((r) => r.id), ['a', 'b', 'c']);
});
