import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	CHANNELS,
	IDENTITY_TONES,
	attachmentBadge,
	channelStyle,
	identityStyle,
	identityTone,
	mailboxChannel,
	messageChannel
} from '../src/lib/mail/colors.ts';

test('channels: a row is coloured by what it is, with the folder outranking flags', () => {
	assert.equal(messageChannel({ mailboxKind: 'inbox' }).key, 'correspondence');
	assert.equal(messageChannel({ mailboxKind: 'inbox', starred: true }).key, 'flagged');
	assert.equal(messageChannel({ mailboxKind: 'inbox', important: true }).key, 'needs');
	// Your own flag outranks the server's "important".
	assert.equal(messageChannel({ mailboxKind: 'inbox', starred: true, important: true }).key, 'flagged');
	assert.equal(messageChannel({ mailboxKind: 'sent' }).key, 'confirmed');
	assert.equal(messageChannel({ mailboxKind: 'drafts' }).key, 'needs');
	// Junk and trash discard whatever the message's own flags say.
	assert.equal(messageChannel({ mailboxKind: 'trash', starred: true }).key, 'discard');
	assert.equal(messageChannel({ mailboxKind: 'junk', important: true }).key, 'discard');
	assert.equal(messageChannel({}).key, 'correspondence');
});

test('channels: folders take a channel, custom folders are digests', () => {
	assert.equal(mailboxChannel('inbox').key, 'correspondence');
	assert.equal(mailboxChannel('archive').key, 'correspondence');
	assert.equal(mailboxChannel('sent').key, 'confirmed');
	assert.equal(mailboxChannel('drafts').key, 'needs');
	assert.equal(mailboxChannel('junk').key, 'discard');
	assert.equal(mailboxChannel('trash').key, 'discard');
	assert.equal(mailboxChannel('newsletters').key, 'digest');
	assert.equal(mailboxChannel(undefined).key, 'digest');
});

test('channels: every channel has a fill, a matching stroke, a solid and an ink', () => {
	for (const channel of Object.values(CHANNELS)) {
		for (const part of ['fill', 'stroke', 'solid', 'ink'] as const) {
			assert.match(channel[part], /^#[0-9a-f]{6}$/, `${channel.key}.${part}`);
		}
		assert.ok(channel.label.length > 0);
	}
	assert.equal(channelStyle(CHANNELS.needs), '--z-fill:#fde68a;--z-stroke:#d97706;--z-rail:#d97706;--z-ink-on:#78350f');
});

test('identity: the same person is the same tone, and teal is not one of them', () => {
	assert.equal(identityTone('ada@zaur.app').name, identityTone('ADA@zaur.app ').name);
	assert.equal(IDENTITY_TONES.length, 8);
	assert.ok(!IDENTITY_TONES.some((tone) => (tone.name as string) === 'teal'));
	const names = new Set(
		['a@x', 'b@x', 'c@x', 'd@x', 'e@x', 'f@x', 'g@x', 'h@x', 'i@x', 'j@x', 'k@x'].map((seed) => identityTone(seed).name)
	);
	assert.ok(names.size > 1, 'the ramp is actually used');
	assert.match(identityStyle('ada@zaur.app'), /^--z-id-fill:#[0-9a-f]{6};--z-id-stroke:#[0-9a-f]{6};--z-id-ink:#[0-9a-f]{6}$/);
});

test('attachments: a PDF is red, an image sky, an archive amber, the rest green', () => {
	assert.equal(attachmentBadge('application/pdf').text, '#b91c1c');
	assert.equal(attachmentBadge('image/png').text, '#0369a1');
	assert.equal(attachmentBadge('application/zip').text, '#b45309');
	assert.equal(attachmentBadge('text/plain').text, '#15803d');
});
