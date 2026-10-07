// Plates: real screenshots of every project, so the canvas can be browsed
// without opening anything. Public sites were captured from the live page
// (desktop 1440×900 scaled to 1200 wide, phone 390×844, scrollbars hidden),
// each frame a deliberately chosen page rather than a scroll offset. Mail
// and Music need an account, so they keep their demo-account plates.
//
// Frames are the "key screens" a peek strip scrubs through, in order.
// Every file is imported so it gets a hashed URL (see DESIGN.md, Hashed Asset Rule).

const files = import.meta.glob('./plates/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const file = (name: string) => files[`./plates/${name}.webp`];

export type Plate = { src: string; alt: string; w: number; h: number };
export type Plates = {
	frames: Plate[];
	phone?: Plate;
	/** Where the pixels come from, for the caption. */
	source: 'live' | 'demo';
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
	fixtar: [
		'the home page with the "Twój dom, twoja moc" hero',
		'the grinders and polishers category',
		'a product page, the EUMS-3150 mitre saw'
	],
	register: ['the "Create your address" form'],
	// Dino has no plates: its node runs the real sky (LiveSky.svelte).
	thebest: ['the "Discover Kraków" hero', 'the Explore Tours grid', 'a tour page, kayaking on the Dunajec river'],
	festivals: ['the year-ahead timeline', 'the Unsound Festival page', 'the Waking Life page'],
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

const live = (id: string, name: string): Plates => ({
	source: 'live',
	frames: framesFor(id, name),
	phone: file(`${id}-phone`) ? { src: file(`${id}-phone`), alt: `${name} on a phone.`, w: 390, h: 844 } : undefined
});

// Demo-account plates. More Mail screens can be dropped in as mail-2.webp,
// mail-3.webp… (1200×750) and described here in order.
const mailScreens = ['the calendar', 'contacts', 'files', 'a Meet video call'];
const demo: Record<string, Plates> = {
	mail: {
		source: 'demo',
		frames: [
			{
				src: file('mail-desktop'),
				alt: 'Zaur Mail on a desktop: folders on the left, the inbox list, and an open three-message thread.',
				w: 1440,
				h: 900
			},
			...mailScreens
				.map((what, i) => ({ src: file(`mail-${i + 2}`), alt: `Zaur Mail: ${what}.`, w: 1200, h: 750 }))
				.filter((f) => f.src)
		],
		phone: { src: file('mail-phone'), alt: 'Zaur Mail on a phone: the inbox with unread and flagged messages.', w: 585, h: 1266 }
	},
	music: {
		source: 'demo',
		frames: [{ src: file('music-desktop'), alt: 'Zaur Music on a desktop: the library home with recently added albums.', w: 1440, h: 460 }]
	}
};

/** Plates for a project, or null when none were captured. */
export function platesFor(id: string, name: string): Plates | null {
	const p = demo[id] ?? live(id, name);
	return p.frames.length ? p : null;
}
