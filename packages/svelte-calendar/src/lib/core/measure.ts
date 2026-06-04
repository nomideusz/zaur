/**
 * Text measurement utilities powered by Pretext.
 *
 * Provides DOM-free text measurement for calendar event blocks.
 * Pretext is an optional peer dependency — if not installed,
 * these functions degrade gracefully to simple heuristics.
 *
 * Usage:
 *   const m = createTextMeasure({ font: '500 12px Inter' });
 *   const fits = m.fits('Meeting with team', 120, 16); // width, lineHeight
 *   const { height, lineCount } = m.measure('Long event title...', 120, 16);
 *   m.clear(); // release caches
 */

export interface TextMeasure {
	/**
	 * Measure text height at a given width.
	 * Returns { height, lineCount }.
	 */
	measure(text: string, maxWidth: number, lineHeight: number): { height: number; lineCount: number };

	/**
	 * Check if text fits in a single line at the given width.
	 */
	fits(text: string, maxWidth: number, lineHeight: number): boolean;

	/**
	 * Measure multiple texts and return their combined height.
	 * Useful for checking if title + subtitle + tags fit in a block.
	 */
	measureStack(
		items: Array<{ text: string; font?: string; lineHeight?: number }>,
		maxWidth: number,
		gap?: number,
	): { height: number; breakdown: Array<{ height: number; lineCount: number }> };

	/**
	 * Given available height and width, decide which content layers fit.
	 * Returns a visibility map for common event fields.
	 */
	fitContent(opts: {
		title: string;
		subtitle?: string;
		location?: string;
		time?: string;
		tags?: string[];
		maxWidth: number;
		maxHeight: number;
	}): ContentFit;

	/** Release internal caches. */
	clear(): void;

	/** Whether Pretext is available (true) or using heuristic fallback (false). */
	readonly available: boolean;
}

export interface ContentFit {
	/** Title always shown */
	title: true;
	/** Number of lines the title takes */
	titleLines: number;
	/** Whether subtitle fits */
	subtitle: boolean;
	/** Whether location fits */
	location: boolean;
	/** Whether time range fits */
	time: boolean;
	/** Whether tags fit */
	tags: boolean;
	/** Total height of all visible content */
	totalHeight: number;
}

export interface TextMeasureOptions {
	/** CSS font shorthand for titles (e.g. '500 12px Inter') */
	titleFont?: string;
	/** CSS font shorthand for secondary text (subtitle, location, time) */
	secondaryFont?: string;
	/** CSS font shorthand for tags */
	tagFont?: string;
	/** Default line height for titles */
	titleLineHeight?: number;
	/** Default line height for secondary text */
	secondaryLineHeight?: number;
	/** Gap between content rows in px */
	contentGap?: number;
}

const DEFAULTS: Required<TextMeasureOptions> = {
	titleFont: '500 12px system-ui, sans-serif',
	secondaryFont: '400 10px system-ui, sans-serif',
	tagFont: '500 8px system-ui, sans-serif',
	titleLineHeight: 16,
	secondaryLineHeight: 13,
	contentGap: 3,
};

/**
 * Create a text measure instance.
 * Lazily loads Pretext on first use. Falls back to char-width heuristics if unavailable.
 */
export function createTextMeasure(opts: TextMeasureOptions = {}): TextMeasure {
	const config = { ...DEFAULTS, ...opts };

	// Pretext module — loaded lazily
	let pretext: {
		prepare: (text: string, font: string) => unknown;
		layout: (prepared: unknown, maxWidth: number, lineHeight: number) => { height: number; lineCount: number };
		clearCache: () => void;
	} | null = null;
	let loadAttempted = false;
	let pretextAvailable = false;

	// Cache prepared texts (font+text → prepared handle)
	const cache = new Map<string, unknown>();

	function tryLoadPretext(): boolean {
		if (loadAttempted) return pretextAvailable;
		loadAttempted = true;
		try {
			// Dynamic require/import for optional dependency
			// This works because Pretext is a synchronous API
			const mod = (globalThis as any).__pretextModule;
			if (mod) {
				pretext = mod;
				pretextAvailable = true;
			}
		} catch {
			// Not available — that's fine
		}
		return pretextAvailable;
	}

	function getPrepared(text: string, font: string): unknown {
		const key = `${font}\0${text}`;
		let prepared = cache.get(key);
		if (!prepared) {
			prepared = pretext!.prepare(text, font);
			cache.set(key, prepared);
		}
		return prepared;
	}

	// Heuristic fallback: estimate chars per line from average char width
	function heuristicMeasure(text: string, maxWidth: number, lineHeight: number, font: string): { height: number; lineCount: number } {
		// Rough average char widths by font size
		const sizeMatch = font.match(/(\d+)px/);
		const fontSize = sizeMatch ? parseInt(sizeMatch[1]) : 12;
		const avgCharWidth = fontSize * 0.55; // rough average for Latin text
		const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth));
		const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine));
		return { height: lineCount * lineHeight, lineCount };
	}

	function measureOne(text: string, maxWidth: number, lineHeight: number, font: string): { height: number; lineCount: number } {
		if (!text) return { height: 0, lineCount: 0 };
		if (pretextAvailable && pretext) {
			const prepared = getPrepared(text, font);
			return pretext.layout(prepared, maxWidth, lineHeight);
		}
		return heuristicMeasure(text, maxWidth, lineHeight, font);
	}

	return {
		get available() {
			tryLoadPretext();
			return pretextAvailable;
		},

		measure(text: string, maxWidth: number, lineHeight: number) {
			tryLoadPretext();
			return measureOne(text, maxWidth, lineHeight, config.titleFont);
		},

		fits(text: string, maxWidth: number, lineHeight: number) {
			tryLoadPretext();
			const { lineCount } = measureOne(text, maxWidth, lineHeight, config.titleFont);
			return lineCount <= 1;
		},

		measureStack(items, maxWidth, gap = config.contentGap) {
			tryLoadPretext();
			const breakdown: Array<{ height: number; lineCount: number }> = [];
			let totalHeight = 0;
			for (const item of items) {
				if (!item.text) {
					breakdown.push({ height: 0, lineCount: 0 });
					continue;
				}
				const font = item.font ?? config.secondaryFont;
				const lh = item.lineHeight ?? config.secondaryLineHeight;
				const result = measureOne(item.text, maxWidth, lh, font);
				breakdown.push(result);
				if (result.height > 0) {
					totalHeight += (totalHeight > 0 ? gap : 0) + result.height;
				}
			}
			return { height: totalHeight, breakdown };
		},

		fitContent(opts) {
			tryLoadPretext();
			const { title, subtitle, location, time, tags, maxWidth, maxHeight } = opts;
			const gap = config.contentGap;

			// Title always measured
			const titleResult = measureOne(title, maxWidth, config.titleLineHeight, config.titleFont);
			let used = titleResult.height;
			const result: ContentFit = {
				title: true,
				titleLines: titleResult.lineCount,
				subtitle: false,
				location: false,
				time: false,
				tags: false,
				totalHeight: used,
			};

			// Try adding time
			if (time) {
				const h = measureOne(time, maxWidth, config.secondaryLineHeight, config.secondaryFont);
				if (used + gap + h.height <= maxHeight) {
					result.time = true;
					used += gap + h.height;
				}
			}

			// Try adding subtitle
			if (subtitle) {
				const h = measureOne(subtitle, maxWidth, config.secondaryLineHeight, config.secondaryFont);
				if (used + gap + h.height <= maxHeight) {
					result.subtitle = true;
					used += gap + h.height;
				}
			}

			// Try adding location
			if (location) {
				const h = measureOne(location, maxWidth, config.secondaryLineHeight, config.secondaryFont);
				if (used + gap + h.height <= maxHeight) {
					result.location = true;
					used += gap + h.height;
				}
			}

			// Try adding tags
			if (tags?.length) {
				const tagText = tags.join('  ');
				const h = measureOne(tagText, maxWidth, config.secondaryLineHeight, config.tagFont);
				if (used + gap + h.height <= maxHeight) {
					result.tags = true;
					used += gap + h.height;
				}
			}

			result.totalHeight = used;
			return result;
		},

		clear() {
			cache.clear();
			if (pretextAvailable && pretext) {
				pretext.clearCache();
			}
		},
	};
}

/**
 * Initialize Pretext for text measurement.
 * Call this once in your app's entry point (e.g., +layout.svelte onMount).
 * If not called, measurement falls back to character-width heuristics.
 *
 * Usage:
 *   import { initTextMeasure } from '@nomideusz/svelte-calendar';
 *   onMount(() => initTextMeasure());
 */
export async function initTextMeasure(): Promise<boolean> {
	try {
		const mod = await import('@chenglou/pretext');
		(globalThis as any).__pretextModule = {
			prepare: mod.prepare,
			layout: mod.layout,
			clearCache: mod.clearCache,
		};
		return true;
	} catch {
		return false;
	}
}
