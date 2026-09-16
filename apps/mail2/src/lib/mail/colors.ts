/**
 * Colour, in two channels that never overlap (design system v2).
 *
 * **Channels** say what kind of thing something is. Six fixed hues, each a
 * pastel fill, a saturated stroke that matches it, a dark ink for text on the
 * fill, and a solid for filled controls. Rails, chips, unread washes, folder
 * rows and toasts wear a channel. A channel is never a person.
 *
 * **Identity** says who. Eight quieter tones, picked deterministically per
 * address, worn only by the avatar tile — in a list row, the reader's sender
 * card, a recipient chip, the account button. Teal is reserved for the brand.
 *
 * v1 hashed the sender into five hues and put it on the rail, so colour was
 * identity — and identity is noise: two unrelated senders share a hue, and
 * the same colour means something different in every row.
 */

export type ChannelKey =
	| 'correspondence'
	| 'confirmed'
	| 'needs'
	| 'flagged'
	| 'digest'
	| 'discard';

export interface Channel {
	key: ChannelKey;
	/** What the chip says. */
	label: string;
	fill: string;
	stroke: string;
	solid: string;
	ink: string;
}

export const CHANNELS: Record<ChannelKey, Channel> = {
	correspondence: { key: 'correspondence', label: 'Correspondence', fill: '#dbeafe', stroke: '#3b82f6', solid: '#2563eb', ink: '#1e40af' },
	confirmed: { key: 'confirmed', label: 'Confirmed', fill: '#dcfce7', stroke: '#16a34a', solid: '#16a34a', ink: '#14532d' },
	needs: { key: 'needs', label: 'Needs you', fill: '#fde68a', stroke: '#d97706', solid: '#d97706', ink: '#78350f' },
	flagged: { key: 'flagged', label: 'Flagged', fill: '#fbcfe8', stroke: '#db2777', solid: '#db2777', ink: '#831843' },
	digest: { key: 'digest', label: 'Digest', fill: '#ddd6fe', stroke: '#7c3aed', solid: '#7c3aed', ink: '#4c1d95' },
	discard: { key: 'discard', label: 'Junk', fill: '#fee2e2', stroke: '#ef4444', solid: '#dc2626', ink: '#b91c1c' }
};

/** Inline style vars the shared `.z-chip` / `.z-hue-wash` / `.z-tile` read. */
export function channelStyle(channel: Channel): string {
	return `--z-fill:${channel.fill};--z-stroke:${channel.stroke};--z-rail:${channel.solid};--z-ink-on:${channel.ink}`;
}

/**
 * Which channel a message row is: the folder decides for junk, trash, sent
 * and drafts; your own flag outranks the server's "important"; everything
 * else is correspondence. Derived from what JMAP already gives us — nothing
 * here is a new property of a message.
 */
export function messageChannel(input: {
	mailboxKind?: string | null;
	starred?: boolean;
	important?: boolean;
}): Channel {
	const kind = input.mailboxKind ?? '';
	if (kind === 'junk' || kind === 'trash') return CHANNELS.discard;
	if (input.starred) return CHANNELS.flagged;
	if (input.important) return CHANNELS.needs;
	if (kind === 'sent') return CHANNELS.confirmed;
	if (kind === 'drafts') return CHANNELS.needs;
	return CHANNELS.correspondence;
}

/**
 * A folder's channel — its checkbox and rail when it is the open one, and the
 * ink of its unread count. Inbox and Archive are correspondence; Sent is what
 * has been confirmed; Drafts need you; Junk and Trash discard. Anything else
 * (a custom folder) is a digest, because that is what people file into them.
 */
export function mailboxChannel(kind: string | undefined | null): Channel {
	switch (kind) {
		case 'inbox':
		case 'archive':
			return CHANNELS.correspondence;
		case 'sent':
			return CHANNELS.confirmed;
		case 'drafts':
			return CHANNELS.needs;
		case 'junk':
		case 'trash':
			return CHANNELS.discard;
		default:
			return CHANNELS.digest;
	}
}

/* ── Identity ─────────────────────────────────────────────────────────── */

export type IdentityToneName =
	| 'steel'
	| 'sky'
	| 'indigo'
	| 'rose'
	| 'lime'
	| 'orange'
	| 'plum'
	| 'stone';

export interface IdentityTone {
	name: IdentityToneName;
	fill: string;
	stroke: string;
	ink: string;
}

export const IDENTITY_TONES: IdentityTone[] = [
	{ name: 'steel', fill: '#dbe3ec', stroke: '#64748b', ink: '#1e293b' },
	{ name: 'sky', fill: '#bae6fd', stroke: '#0284c7', ink: '#0c4a6e' },
	{ name: 'indigo', fill: '#c7d2fe', stroke: '#4f46e5', ink: '#312e81' },
	{ name: 'rose', fill: '#fecdd3', stroke: '#e11d48', ink: '#881337' },
	{ name: 'lime', fill: '#d9f99d', stroke: '#65a30d', ink: '#365314' },
	{ name: 'orange', fill: '#fed7aa', stroke: '#ea580c', ink: '#7c2d12' },
	{ name: 'plum', fill: '#e9d5ff', stroke: '#9333ea', ink: '#581c87' },
	{ name: 'stone', fill: '#e7e5e4', stroke: '#78716c', ink: '#292524' }
];

function hash(seed: string): number {
	const str = (seed || '').trim().toLowerCase();
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		h = (h << 5) - h + str.charCodeAt(i);
		h |= 0;
	}
	return Math.abs(h);
}

/** The same person is the same tone, wherever their tile appears. */
export function identityTone(seed: string): IdentityTone {
	return IDENTITY_TONES[hash(seed) % IDENTITY_TONES.length]!;
}

/** Inline style vars the shared `.z-avatar` reads. */
export function identityStyle(seed: string): string {
	const tone = identityTone(seed);
	return `--z-id-fill:${tone.fill};--z-id-stroke:${tone.stroke};--z-id-ink:${tone.ink}`;
}

/* ── Compatibility ────────────────────────────────────────────────────── */

/**
 * The v1 shape a few call sites still read (recipient chips, the account
 * button, contacts and calendar). Backed by the identity ramp now, so those
 * sites already show the person's tone; they will move to `identityTone`
 * as they are touched.
 */
export interface HobdayColorTheme {
	name: string;
	bg: string;
	border: string;
	text: string;
	accent: string;
	checkboxBg: string;
	badgeBg: string;
	badgeBorder: string;
	badgeText: string;
}

export function getHobdayTheme(seed: string): HobdayColorTheme {
	const tone = identityTone(seed);
	return {
		name: tone.name,
		bg: tone.fill,
		border: tone.stroke,
		text: tone.ink,
		accent: tone.stroke,
		checkboxBg: tone.stroke,
		badgeBg: tone.fill,
		badgeBorder: tone.stroke,
		badgeText: tone.ink
	};
}

export interface MailboxColors {
	/** The solid fill of the folder's checkbox, and its rail when it is open. */
	check: string;
	badgeBg: string;
	badgeBorder: string;
	badgeText: string;
	channel: Channel;
}

/** A folder's colours, all from its channel. */
export function mailboxTheme(kind: string | undefined | null): MailboxColors {
	const channel = mailboxChannel(kind);
	return {
		check: channel.solid,
		badgeBg: '#ffffff',
		badgeBorder: channel.stroke,
		badgeText: channel.ink,
		channel
	};
}

/* ── Attachments ──────────────────────────────────────────────────────── */

/**
 * The kind badge on an attachment chip — the same in the reader and in a
 * compose draft, so a file looks the same before and after it is sent. PDFs
 * are the discard hue (a PDF has always been red), images sky, archives
 * needs-amber, everything else confirmed-green — light variants, because the
 * badge sits on a white chip and is 9px tall.
 */
export function attachmentBadge(type: string): { bg: string; border: string; text: string } {
	const mime = (type || '').toLowerCase();
	if (mime.includes('pdf')) return { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' };
	if (mime.includes('image')) return { bg: '#e0f2fe', border: '#38bdf8', text: '#0369a1' };
	if (mime.includes('zip') || mime.includes('archive') || mime.includes('compressed')) {
		return { bg: '#fef3c7', border: '#fcd34d', text: '#b45309' };
	}
	return { bg: '#dcfce7', border: '#4ade80', text: '#15803d' };
}

/** The unread count's colours: sky, everywhere a count sits on a control. */
export const COUNT_BADGE = { bg: '#e0f2fe', border: '#38bdf8', text: '#0369a1' };
