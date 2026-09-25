import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	CHANNELS,
	IDENTITY_TONES,
	attachmentBadge,
	categoryChannel,
	channelStyle,
	identityStyle,
	identityTone,
	labelChannel,
	mailboxChannel,
	messageChannel
} from '../src/lib/mail/colors.ts';

test('channels: a row is coloured by what it carries, then by where it is', () => {
	assert.equal(messageChannel({}).key, 'correspondence');
	assert.equal(messageChannel({ mailboxKind: 'inbox' }).key, 'correspondence');
	assert.equal(messageChannel({ starred: true }).key, 'flagged');
	assert.equal(messageChannel({ important: true }).key, 'needs');
	// Your own flag outranks the server's "important".
	assert.equal(messageChannel({ starred: true, important: true }).key, 'flagged');
	// A category is a digest, whichever one; "other" is a person.
	for (const category of ['receipts', 'transactions', 'newsletters', 'notifications']) {
		assert.equal(messageChannel({ category }).key, 'digest', category);
	}
	assert.equal(messageChannel({ category: 'other' }).key, 'correspondence');
	// A mark still outranks the category.
	assert.equal(messageChannel({ category: 'newsletters', starred: true }).key, 'flagged');
	assert.equal(messageChannel({ category: 'receipts', important: true }).key, 'needs');
	// Then the place: what you wrote, what is gone.
	assert.equal(messageChannel({ mailboxKind: 'sent' }).key, 'confirmed');
	assert.equal(messageChannel({ mailboxKind: 'drafts' }).key, 'confirmed');
	assert.equal(messageChannel({ mailboxKind: 'junk' }).key, 'discard');
	assert.equal(messageChannel({ mailboxKind: 'trash' }).key, 'discard');
	// A label still wins over the place.
	assert.equal(messageChannel({ mailboxKind: 'trash', starred: true }).key, 'flagged');
	assert.equal(messageChannel({ mailboxKind: 'sent', category: 'receipts' }).key, 'digest');
});

test('channels: a label and a rule action wear the hue the rows they name would', () => {
	assert.equal(labelChannel('flagged').key, 'flagged');
	assert.equal(labelChannel('important').key, 'needs');
	assert.equal(labelChannel('cat:receipts').key, 'digest');
	assert.equal(labelChannel('cat:newsletters').key, 'digest');
	assert.equal(labelChannel('all').key, 'correspondence');
	assert.equal(categoryChannel('transactions').key, categoryChannel('receipts').key);
	assert.equal(categoryChannel(undefined).key, 'correspondence');
});

test('channels: folders take a hue no label uses', () => {
	assert.equal(mailboxChannel('inbox').key, 'correspondence');
	assert.equal(mailboxChannel('archive').key, 'correspondence');
	assert.equal(mailboxChannel('custom').key, 'correspondence');
	assert.equal(mailboxChannel(undefined).key, 'correspondence');
	assert.equal(mailboxChannel('drafts').key, 'confirmed');
	assert.equal(mailboxChannel('sent').key, 'confirmed');
	assert.equal(mailboxChannel('scheduled').key, 'confirmed');
	assert.equal(mailboxChannel('junk').key, 'discard');
	assert.equal(mailboxChannel('trash').key, 'discard');
	// The sharing that confused: Drafts is not Important's amber, Sent is not a category's violet.
	const labelHues = new Set(['flagged', 'important', 'cat:receipts'].map((f) => labelChannel(f as never).key));
	for (const kind of ['drafts', 'sent', 'junk', 'trash']) assert.ok(!labelHues.has(mailboxChannel(kind).key), kind);
});

test('channels: every part is a token reference, so a channel follows the theme', () => {
	for (const channel of Object.values(CHANNELS)) {
		for (const part of ['fill', 'stroke', 'solid', 'ink'] as const) {
			assert.equal(channel[part], `var(--z-ch-${channel.key}-${part})`, `${channel.key}.${part}`);
		}
		assert.ok(channel.label.length > 0);
	}
	assert.equal(
		channelStyle(CHANNELS.needs),
		'--z-fill:var(--z-ch-needs-fill);--z-stroke:var(--z-ch-needs-stroke);--z-rail:var(--z-ch-needs-solid);--z-ink-on:var(--z-ch-needs-ink)'
	);
});

test('identity: the same person is the same tone, and teal is not one of them', () => {
	assert.equal(identityTone('ada@zaur.app').name, identityTone('ADA@zaur.app ').name);
	assert.equal(IDENTITY_TONES.length, 8);
	assert.ok(!IDENTITY_TONES.some((tone) => (tone.name as string) === 'teal'));
	const names = new Set(
		['a@x', 'b@x', 'c@x', 'd@x', 'e@x', 'f@x', 'g@x', 'h@x', 'i@x', 'j@x', 'k@x'].map((seed) => identityTone(seed).name)
	);
	assert.ok(names.size > 1, 'the ramp is actually used');
	assert.match(
		identityStyle('ada@zaur.app'),
		/^--z-id-fill:var\(--z-id-(\w+)-fill\);--z-id-stroke:var\(--z-id-\1-stroke\);--z-id-ink:var\(--z-id-\1-ink\)$/
	);
});

test('attachments: a PDF is red, an image sky, an archive amber, the rest green', () => {
	assert.equal(attachmentBadge('application/pdf').text, '#b91c1c');
	assert.equal(attachmentBadge('image/png').text, '#0369a1');
	assert.equal(attachmentBadge('application/zip').text, '#b45309');
	assert.equal(attachmentBadge('text/plain').text, '#15803d');
});
