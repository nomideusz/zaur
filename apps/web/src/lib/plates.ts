// Plates: real screenshots of every project, so the canvas can be browsed
// without opening anything. Public sites were captured from the live page
// (desktop 1440×900 scaled to 1200 wide, phone 390×844, scrollbars hidden),
// each frame a deliberately chosen page rather than a scroll offset.
//
// Frames are the "key screens" a peek strip scrubs through, in order.
// Every file is imported so it gets a hashed URL (see DESIGN.md, Hashed Asset Rule).

const files = import.meta.glob('./plates/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const file = (name: string) => files[`./plates/${name}.webp`];

export type Plate = { src: string; alt: string; w: number; h: number };
export type Plates = {
	/** Whole screens, one per page, shown in the Look inside dialog. */
	frames: Plate[];
	/**
	 * Chosen details of the same pages, one per frame, shown in the peek strip
	 * when present: a 16:10 clip around the element that matters, captured at
	 * 2× so it stays crisp in a node. Named <id>-f1.webp, <id>-f2.webp…
	 */
	fragments?: Plate[];
	phone?: Plate;
};

/** The day the live sites were captured. */
export const capturedOn = '2026-10-07';

// What each desktop frame shows, in the project's own words.
const screens: Record<string, string[]> = {
	szkolyjogi: [
		'a studio profile, Yoga Shala Kraków, with photos, schedule and reviews',
		'"Yoga today in Kraków", every class of the day on one timeline',
		'the Kraków page, studios by style with schedules and prices'
	],
	pikastro: ['the "Dość beżu, czas na kolor" hero', 'the interior and graphic design portfolio', 'the about page'],
	kurcz: [
		'the home page with the muscle anatomy illustration',
		'the first-aid guide for an acute cramp',
		'the night cramps article'
	],
	recycling: ['the home page, where to hand in e-waste, batteries, oils and tyres', 'collection points in Kraków', 'the recycling guide'],
	tutitutu: ['the home page', 'the realisations gallery', 'a showroom realisation'],
	kruk: ['the KRUK home page', 'the real-time drawing board', 'the kanban board'],
	wibroakustyka: ['the Graal acoustic chair', 'how vibroacoustics works', 'what an acoustic chair is'],
	intertech: ['the home page for Picarro and UGT', 'CRDS spectroscopy', 'gas leak detection from the air'],
	polaczenie: ['the acupuncture clinic home page', 'the therapist at work'],
	radiobartek: ['the player page']
};

// Frames named <id>-1, <id>-2… in ./plates, described in order.
const framesFor = (id: string, name: string): Plate[] =>
	(screens[id] ?? [])
		.map((what, i) => ({ src: file(`${id}-${i + 1}`), alt: `${name}: ${what}.`, w: 1200, h: 750 }))
		.filter((f) => f.src);

// Fragments named <id>-f1, <id>-f2… pair with the frames in order.
const fragmentsFor = (id: string, name: string): Plate[] | undefined => {
	const list = (screens[id] ?? [])
		.map((what, i) => ({ src: file(`${id}-f${i + 1}`), alt: `${name}: a detail of ${what}.`, w: 1200, h: 750 }))
		.filter((f) => f.src);
	return list.length ? list : undefined;
};

const live = (id: string, name: string): Plates => ({
	frames: framesFor(id, name),
	fragments: fragmentsFor(id, name),
	phone: file(`${id}-phone`) ? { src: file(`${id}-phone`), alt: `${name} on a phone.`, w: 390, h: 844 } : undefined
});

/** Plates for a project, or null when none were captured. */
export function platesFor(id: string, name: string): Plates | null {
	const p = live(id, name);
	return p.frames.length ? p : null;
}
