/**
 * Colour, in two channels that never overlap (design system v2).
 *
 * **Channels** say what kind of thing something is. Six fixed hues, each a
 * pastel fill, a saturated stroke that matches it, a dark ink for text on the
 * fill, and a solid for filled controls. Rails, chips, unread washes, label
 * rows and toasts wear a channel. A channel is never a person.
 *
 * One hue, one meaning, wherever it is drawn — a folder row, a label, a
 * message row, the reader's sender card, a rule's action chip all agree.
 * Three hues are labels a message carries, three are where mail comes from
 * or goes, and no hue is both:
 *
 *   needs           Important — something is waiting on you   `$important`
 *   flagged         Flagged — your own mark                    `$flagged`
 *   digest          a category — automated, read when you like `cat.*` (receipts, transactions, newsletters, notifications)
 *   confirmed       mail you write                             Drafts, Sent, Scheduled
 *   discard         gone                                       Junk, Trash
 *   correspondence  mail that came to you, from a person       Inbox, Archive, custom folders, unlabelled rows
 *
 * The v2 design's sidebar gave Drafts the Important amber and the receipts
 * label the Sent green; that sharing is the one thing changed here.
 *
 * **Identity** says who. Eight quieter tones, picked deterministically per
 * address, worn only by the avatar tile — in a list row, the reader's sender
 * card, a recipient chip, the account button. Teal is reserved for the brand.
 *
 * v1 hashed the sender into five hues and put it on the rail, so colour was
 * identity — and identity is noise: two unrelated senders share a hue, and
 * the same colour means something different in every row.
 */

import { CATEGORY_OTHER } from '@zaur/mail-core';
import type { ListFilter } from './labels';

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

/**
 * Every value is a token reference, not a hex: the hex lives in `tokens.css`
 * (light and dark), so a channel painted from here follows the theme.
 */
function channel(key: ChannelKey, label: string): Channel {
	return {
		key,
		label,
		fill: `var(--z-ch-${key}-fill)`,
		stroke: `var(--z-ch-${key}-stroke)`,
		solid: `var(--z-ch-${key}-solid)`,
		ink: `var(--z-ch-${key}-ink)`
	};
}

export const CHANNELS: Record<ChannelKey, Channel> = {
	correspondence: channel('correspondence', 'Correspondence'),
	confirmed: channel('confirmed', 'Confirmed'),
	needs: channel('needs', 'Important'),
	flagged: channel('flagged', 'Flagged'),
	digest: channel('digest', 'Digest'),
	discard: channel('discard', 'Junk')
};

/** Inline style vars the shared `.z-chip` / `.z-hue-wash` / `.z-tile` read. */
export function channelStyle(channel: Channel): string {
	return `--z-fill:${channel.fill};--z-stroke:${channel.stroke};--z-rail:${channel.solid};--z-ink-on:${channel.ink}`;
}

/**
 * A content category's channel: every category is a digest — automated mail,
 * read when you like. "Other" (a person, or nothing the classifier could
 * place) and no category at all are correspondence.
 */
export function categoryChannel(category: string | null | undefined): Channel {
	return category && category !== CATEGORY_OTHER ? CHANNELS.digest : CHANNELS.correspondence;
}

/**
 * Which channel a message row is: what it carries first — your own flag
 * outranks the server's "important", which outranks the category — and then
 * where it is, for mail you wrote and mail that is gone. Derived from what
 * JMAP already gives us — nothing here is a new property of a message.
 */
export function messageChannel(input: {
	mailboxKind?: string | null;
	starred?: boolean;
	important?: boolean;
	category?: string | null;
}): Channel {
	if (input.starred) return CHANNELS.flagged;
	if (input.important) return CHANNELS.needs;
	if (input.category && input.category !== CATEGORY_OTHER) return CHANNELS.digest;
	return mailboxChannel(input.mailboxKind);
}

/** A label wears the channel the rows it narrows to would: the sidebar's Labels, an empty label's tile. */
export function labelChannel(filter: ListFilter | undefined): Channel {
	if (filter === 'flagged') return CHANNELS.flagged;
	if (filter === 'important') return CHANNELS.needs;
	if (filter?.startsWith('cat:')) return categoryChannel(filter.slice(4));
	return CHANNELS.correspondence;
}

/**
 * A folder's channel — its checkbox and rail when it is the open one, a
 * Move-to tile, the ink of its unread count. Mail you write is confirmed
 * green (Drafts, Sent, Scheduled), mail that is gone is discard red (Junk,
 * Trash), and everywhere mail arrives or is kept — Inbox, Archive, a custom
 * folder — is correspondence blue. None of the three is a label's hue.
 */
export function mailboxChannel(kind: string | undefined | null): Channel {
	switch (kind) {
		case 'drafts':
		case 'sent':
		case 'scheduled':
			return CHANNELS.confirmed;
		case 'junk':
		case 'trash':
			return CHANNELS.discard;
		default:
			return CHANNELS.correspondence;
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

/** Token references, like the channels: the hex (light and dark) is in `tokens.css`. */
function tone(name: IdentityToneName): IdentityTone {
	return {
		name,
		fill: `var(--z-id-${name}-fill)`,
		stroke: `var(--z-id-${name}-stroke)`,
		ink: `var(--z-id-${name}-ink)`
	};
}

export const IDENTITY_TONES: IdentityTone[] = [
	tone('steel'),
	tone('sky'),
	tone('indigo'),
	tone('rose'),
	tone('lime'),
	tone('orange'),
	tone('plum'),
	tone('stone')
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
export const COUNT_BADGE = { bg: 'var(--z-count-fill)', border: 'var(--z-count-stroke)', text: 'var(--z-count-ink)' };
