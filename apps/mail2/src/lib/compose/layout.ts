import type { Draft } from './types';

export const PANEL_DEFAULT_W = 560;
export const PANEL_MIN_W = 420;
export const PANEL_MAX_W = 960;
export const PANEL_MIN_H = 240;
export const PANEL_MAX_H = 1000;
export const EDGE = 8;
/** Height a draft settles at once it has a recipient and a subject. */
export const PANEL_TYPICAL_H = 420;
const CASCADE = 26;
const GAP = 14;
/** Shell chrome a maximized panel must not sit under: top bar and status line. */
const TOP_CHROME = 52;
const BOTTOM_CHROME = 36;
const MARGIN = 12;
/** How far an opening panel leans from the shell centre toward its button. */
const CENTRE_PULL = 0.34;

export interface AnchorRect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/** 0 = no recipient yet, 1 = no subject, 2 = ready to write. */
export function computeStep(draft: Pick<Draft, 'to' | 'subject'>): 0 | 1 | 2 {
	if (draft.to.length === 0) return 0;
	if (draft.subject.trim().length === 0) return 1;
	return 2;
}

/** 84 → 112 → 228 → 340: the message box grows as the draft takes shape. */
export function bodyHeightPx(draft: Draft): 84 | 112 | 228 | 340 {
	if (draft.stage === 'maximized') return 340;
	if (draft.bodyOpened) return 228;
	if (draft.to.length === 0) return 84;
	if (draft.subject.trim().length === 0) return 112;
	return 228;
}

/**
 * Panel height while `auto` is on, computed by hand so it can animate
 * (a CSS transition to `height: auto` never runs).
 */
export function computeAutoHeight(draft: Draft): number {
	const toRows = Math.ceil(draft.to.length / 2) * 32;
	return (
		45 + // header
		(28 + toRows) + // To row (chips wrap ~2 per line)
		45 + // subject row
		bodyHeightPx(draft) +
		(draft.ccOpen ? 45 : 0) +
		(draft.bccOpen ? 45 : 0) +
		(draft.attachments.length > 0 ? 54 : 0) +
		(draft.sendError ? 34 : 0) +
		53 // action bar
	);
}

/**
 * Maximize fills the shell's content pane — everything between the top bar and
 * the status line — rather than floating a slightly bigger box in the middle.
 * Pixel-computed so the transition can animate (percent math freezes it).
 */
export function maximizedRect(rootW: number, rootH: number) {
	const w = Math.min(PANEL_MAX_W, Math.max(360, rootW - MARGIN * 2));
	// On a shell too short for the chrome inset, ignore it and use the margin.
	const y = rootH > 420 ? TOP_CHROME + MARGIN : MARGIN;
	const h = Math.min(PANEL_MAX_H, Math.max(260, rootH - y - BOTTOM_CHROME - MARGIN));
	return {
		x: Math.max(MARGIN, Math.round((rootW - w) / 2)),
		y,
		w,
		h
	};
}

/**
 * Opening position: the panel belongs near the middle of the shell — that is
 * where it is comfortable to write — but it should still read as coming from
 * the button that opened it. So take the strictly button-anchored spot, take
 * the centred spot, and sit a third of the way from centre toward the button.
 */
export function openingPosition(
	button: AnchorRect,
	rootW: number,
	rootH: number,
	openCount: number,
	width = PANEL_DEFAULT_W,
	height = PANEL_TYPICAL_H
) {
	// Anchored spot: squarely under the button, centred on it. Sitting *beside*
	// the button reads backwards once it has to flip — a top-right button would
	// throw the panel left.
	const anchoredX = (button.left + button.right) / 2 - width / 2;
	const anchoredY = button.bottom + GAP;

	const centreX = (rootW - width) / 2;
	const centreY = (rootH - height) / 2;
	// Cascade is symmetric about the centre, so a stack of panels spreads
	// through the middle instead of marching off into a corner.
	const offset = (openCount % 5) * CASCADE - CASCADE * 2;

	const x = centreX + (anchoredX - centreX) * CENTRE_PULL + offset;
	const y = centreY + (anchoredY - centreY) * CENTRE_PULL + offset;
	return {
		x: Math.round(clamp(x, EDGE, Math.max(EDGE, rootW - width - EDGE))),
		y: Math.round(clamp(y, MARGIN, Math.max(MARGIN, rootH - height - EDGE)))
	};
}

export function clamp(
	value: number,
	min: number,
	max: number
): number {
	return Math.min(max, Math.max(min, value));
}

/** Clamp a panel rect against the shell container during drag/resize. */
export function clampPanel(
	rect: { x: number; y: number; w: number; h: number },
	rootW: number,
	rootH: number
) {
	const maxW = Math.min(PANEL_MAX_W, rootW - rect.x - EDGE);
	const maxH = Math.min(PANEL_MAX_H, rootH - rect.y - EDGE);
	const w = clamp(rect.w, PANEL_MIN_W, Math.max(PANEL_MIN_W, maxW));
	const h = clamp(rect.h, PANEL_MIN_H, Math.max(PANEL_MIN_H, maxH));
	return {
		x: clamp(rect.x, EDGE, Math.max(EDGE, rootW - w - EDGE)),
		y: clamp(rect.y, 12, Math.max(12, rootH - h - EDGE)),
		w,
		h
	};
}
