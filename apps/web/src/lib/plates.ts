// Plates: real screenshots of every project, so the canvas can be browsed
// without opening anything. Public sites were captured from the live page
// (desktop 1440×900 scaled to 1200 wide, phone 390×844). Mail and Music
// need an account, so they keep their demo-account plates.
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
		'the home page, with search by city, postal code, studio or style',
		'the Warsaw page, with studios, schedules, prices and reviews',
		'the Wrocław page, with studios, schedules, prices and reviews'
	],
	fixtar: [
		'the home page with the "Twój dom, twoja moc" hero',
		'the category grid, from drills and saws to garden tools',
		'the product grid with prices'
	],
	register: ['the "Create your address" form'],
	dino: ['tonight\'s sky over Poland, with the dinosaur'],
	thebest: [
		'the "Discover Kraków" hero',
		'the upcoming tours list and a kayaking trip on the Dunajec',
		'the top tours grid with prices'
	],
	festivals: [
		'the search box and the year-ahead timeline',
		'the timeline by region',
		'the festival list with dates and prices'
	],
	pikastro: [
		'the "Dość beżu, czas na kolor" hero',
		'the "Odmień swoją przestrzeń" section',
		'the 30 m² Kraków case study'
	],
	kurcz: [
		'the home page with the muscle anatomy illustration',
		'the main sections, from causes to first aid and prevention',
		'the frequently asked questions'
	],
	recycling: ['the home page, where to hand in e-waste, batteries, oils and tyres'],
	tutitutu: ['the home page', 'the realisations gallery', 'a showroom realisation'],
	kruk: ['the KRUK home page', 'the Collaborate apps, a drawing board and a kanban', 'the property scraper and pixel canvas'],
	wibroakustyka: ['the Graal acoustic chair', 'the chair described', 'the wellness section'],
	intertech: ['the home page for Picarro and UGT'],
	polaczenie: ['the acupuncture clinic home page', 'the treatments', 'about the therapist'],
	radiobartek: ['the player page']
};

const live = (id: string, name: string): Plates => ({
	source: 'live',
	frames: (screens[id] ?? [])
		.map((what, i) => ({ src: file(`${id}-${i + 1}`), alt: `${name}: ${what}.`, w: 1200, h: 750 }))
		.filter((f) => f.src),
	phone: file(`${id}-phone`) ? { src: file(`${id}-phone`), alt: `${name} on a phone.`, w: 390, h: 844 } : undefined
});

const demo: Record<string, Plates> = {
	mail: {
		source: 'demo',
		frames: [
			{
				src: file('mail-desktop'),
				alt: 'Zaur Mail on a desktop: folders on the left, the inbox list, and an open three-message thread.',
				w: 1440,
				h: 900
			}
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
