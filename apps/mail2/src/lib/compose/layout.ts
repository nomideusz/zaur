import type { Draft } from './types';

export const PANEL_DEFAULT_W = 560;
export const PANEL_MIN_W = 420;
export const PANEL_MAX_W = 760;
export const PANEL_MIN_H = 240;
export const PANEL_MAX_H = 760;
export const EDGE = 8;
const CASCADE = 26;

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

/** Centered, pixel-computed maximized rect (percent math would freeze the transition). */
export function maximizedRect(rootW: number, rootH: number) {
	const w = Math.min(740, Math.max(360, rootW - 48));
	const h = Math.min(620, Math.max(260, rootH - 132));
	return {
		x: Math.max(24, Math.round((rootW - w) / 2)),
		y: 76,
		w,
		h
	};
}

/** Opening position anchored to the New message button (spec steps 1–4). */
export function openingPosition(
	button: AnchorRect,
	rootW: number,
	rootH: number,
	openCount: number,
	width = PANEL_DEFAULT_W
) {
	let x = button.right + 14;
	if (x + width + 16 > rootW) {
		x = Math.max(12, button.left - width - 14);
	}
	let y = clamp(button.top - 8, 12, Math.max(12, rootH - 340));
	const offset = (openCount % 5) * CASCADE;
	x += offset;
	y += offset;
	x = clamp(x, EDGE, Math.max(EDGE, rootW - width - EDGE));
	y = clamp(y, 12, Math.max(12, rootH - PANEL_MIN_H - EDGE));
	return { x, y };
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
