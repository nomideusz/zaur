// svelte-search's matching over this page's own entries: what the package's
// engine does in SQL, done here in the browser on its pure parts, so a visitor
// can watch each step. Text folds with the Polish locale (ł is l, which plain
// NFD leaves alone), then each query token tries, in order: a substring, an
// edit distance to a word or the start of one, and a trigram overlap.
import { levenshteinSimilarity, MIN_SEARCH_TOKEN_LENGTH, normalize, trigramSimilarity, trigrams } from '@nomideusz/svelte-search';
import { plLocale } from '@nomideusz/svelte-search/locales/pl';

export type Entry = { kind: 'product' | 'package' | 'template' | 'site'; name: string; text: string; href: string };
type Indexed = Entry & { folded: string; foldedName: string; words: string[] };
export type Match = { how: 'exact' | 'typo' | 'trigram'; token: string; word?: string; score: number };
export type Result = Indexed & { score: number; matches: Match[] };

export const fold = (s: string) => normalize(s, plLocale);
export const gramsOf = (s: string) => trigrams(s, plLocale);
export const tokensOf = (q: string) => fold(q).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= MIN_SEARCH_TOKEN_LENGTH);

export const indexed = (entries: Entry[]): Indexed[] =>
	entries.map((e) => {
		const folded = fold(`${e.name} ${e.text}`);
		return { ...e, folded, foldedName: fold(e.name), words: [...new Set(folded.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1))] };
	});

function matchToken(token: string, e: Indexed): Match | null {
	if (e.foldedName.includes(token)) return { how: 'exact', token, score: 1 };
	if (e.folded.includes(token)) return { how: 'exact', token, score: 0.8 };
	// One edit in a short word, about two in a long one; against the start of a
	// word too, so a typo in a half-typed word still lands.
	let typo = { word: '', s: 0 };
	let tri = { word: '', s: 0 };
	for (const w of e.words) {
		const s = Math.max(levenshteinSimilarity(token, w), levenshteinSimilarity(token, w.slice(0, token.length)));
		if (s > typo.s) typo = { word: w, s };
		const g = trigramSimilarity(token, w);
		if (g > tri.s) tri = { word: w, s: g };
	}
	if (typo.s >= (token.length < 5 ? 0.75 : 0.7)) return { how: 'typo', token, word: typo.word, score: 0.7 * typo.s };
	if (tri.s >= 0.4) return { how: 'trigram', token, word: tri.word, score: 0.6 * tri.s };
	return null;
}

/** Every token must land somewhere; the mean of its landings ranks the entry. */
export function search(entries: Indexed[], q: string): Result[] {
	const tokens = tokensOf(q);
	if (!tokens.length) return [];
	const out: Result[] = [];
	for (const e of entries) {
		const matches = tokens.map((t) => matchToken(t, e));
		if (matches.every(Boolean)) {
			const ms = matches as Match[];
			out.push({ ...e, matches: ms, score: ms.reduce((a, m) => a + m.score, 0) / ms.length });
		}
	}
	return out.sort((a, b) => b.score - a.score);
}
