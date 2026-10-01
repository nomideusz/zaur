/**
 * The one player: a queue over the layout's <audio>, which outlives every
 * page. The queue and the spot in it survive a reload (localStorage); the
 * phone's lock screen and headphone buttons drive it through Media Session.
 */
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { SvelteMap } from 'svelte/reactivity';
import { api, post } from '#lib/api';
import { notify } from '#lib/notice.svelte';
import type { Song } from '#lib/types';

const SAVED = 'zaur-music.queue';
const PREFS = 'zaur-music.prefs';

type Repeat = 'off' | 'all' | 'one';
interface Saved {
	queue: Song[];
	index: number;
	time: number;
	listened?: number;
	scrobbled?: boolean;
	/** While shuffling: the ids of the songs to come, in the order they had before. */
	straight?: string[];
}
interface Prefs {
	volume?: number;
	muted?: boolean;
	repeat?: Repeat;
	shuffling?: boolean;
}

function shuffled<T>(items: T[]): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

function store(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Private mode or full: it just won't survive a reload.
	}
}

function stored<T>(key: string): T | null {
	try {
		return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
	} catch {
		return null;
	}
}

/**
 * Each song's share of the volume, so a loud one and a quiet one sound alike:
 * its ReplayGain, aimed at -14 LUFS (where YouTube and Spotify play) rather
 * than ReplayGain's -18, so fewer songs come out quieter. A page can only turn
 * the volume down, so a song quieter than that plays as it is.
 */
const AIM = 4;
const level = (song: Song | undefined) => {
	const gain = song?.replayGain?.trackGain;
	if (gain === undefined) return 1;
	const peak = song?.replayGain?.trackPeak || 1;
	return Math.min(1, 10 ** ((gain + AIM) / 20), 1 / peak);
};

const streamUrl = (id: string) => `/api/stream/${encodeURIComponent(id)}`;

export const coverUrl = (id: string | undefined, size = 300) => (id ? `/api/cover/${encodeURIComponent(id)}?size=${size}` : undefined);

class Player {
	queue = $state<Song[]>([]);
	index = $state(-1);
	playing = $state(false);
	/** Asked to play and no sound yet: loading or buffering. */
	waiting = $state(false);
	time = $state(0);
	duration = $state(0);
	volume = $state(1);
	muted = $state(false);
	/** False on iOS, where a page cannot set the loudness (the hardware keys do). */
	volumeWorks = $state(true);
	repeat = $state<Repeat>('off');
	/** What comes next is in a random order; off puts it back as it was. */
	shuffling = $state(false);

	#audio: HTMLAudioElement | undefined;
	#channel: BroadcastChannel | undefined;
	/** The listener means it to be playing (a failed load pauses the element unasked). */
	#wanted = false;
	/** Counts loads, so a late answer about an earlier one can tell it is stale. */
	#loads = 0;
	/** Failed loads in a row, and the song the run started on. */
	#failures = 0;
	#failedAt: number | undefined;
	/** Seconds of the current song actually heard (seeking does not count). */
	#listened = 0;
	#scrobbled = false;
	#announced = false;
	/** The upcoming songs in the order they had before shuffling. */
	#straight: Song[] = [];
	#savedAt = 0;

	get current(): Song | undefined {
		return this.queue[this.index];
	}

	/** Next has somewhere to go. */
	get hasNext(): boolean {
		return this.index < this.queue.length - 1 || this.repeat !== 'off';
	}

	/**
	 * The Now playing sheet. It is a history entry of its own, so Back closes it — and one that
	 * keeps its state over a reload, or the entry would still be there with no sheet to close.
	 * Opening is a shallow navigation: the layout's beforeNavigate sees it (`shallow: true`)
	 * and has to let it pass.
	 */
	get open(): boolean {
		return Boolean(page.state.nowPlaying);
	}
	set open(value: boolean) {
		if (value === this.open) return;
		if (value) void goto('', { state: { nowPlaying: true }, shallow: true, persistState: true });
		else history.back();
	}

	/** Called once by the layout with its <audio>; returns the teardown. */
	attach(audio: HTMLAudioElement): () => void {
		this.#audio = audio;
		const prefs = stored<Prefs>(PREFS) ?? {};
		const volume = Number(prefs.volume ?? 1);
		this.volume = volume >= 0 && volume <= 1 ? volume : 1;
		this.muted = prefs.muted === true;
		// iOS ignores the setting: it reads back 1. A spare element asks, so the real one is untouched.
		const probe = new Audio();
		probe.volume = 0.5;
		this.volumeWorks = probe.volume === 0.5;
		this.repeat = prefs.repeat ?? 'off';
		this.shuffling = prefs.shuffling === true;
		this.#restore();
		this.#sound();
		const on = <K extends keyof HTMLMediaElementEventMap>(type: K, fn: () => void) => {
			audio.addEventListener(type, fn);
			return () => audio.removeEventListener(type, fn);
		};
		const offs = [
			on('play', () => {
				this.playing = true;
				// One tab plays at a time.
				this.#channel?.postMessage('playing');
				this.#position();
			}),
			on('pause', () => {
				this.playing = this.waiting = false;
				// The system pauses too (headphones out, a call). A failed load or the
				// song's end also pause the element, and neither is the listener stopping.
				if (!audio.error && !audio.ended) this.#wanted = false;
				this.#position();
				this.#save();
			}),
			on('waiting', () => (this.waiting = !audio.paused)),
			on('playing', () => {
				this.waiting = false;
				this.#failures = 0;
				this.#failedAt = undefined;
				this.#position();
				// "Now playing" once the song is really heard, not for each one skipped over.
				if (!this.#announced && this.current) {
					this.#announced = true;
					post('/api/scrobble', { id: this.current.id, submission: false });
				}
			}),
			on('durationchange', () => {
				this.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
				this.#position();
			}),
			on('timeupdate', () => this.#tick()),
			on('ended', () => this.#ended()),
			on('error', () => void this.#failed())
		];

		if (typeof BroadcastChannel !== 'undefined') {
			this.#channel = new BroadcastChannel('zaur-music');
			this.#channel.onmessage = () => this.toggle(false);
		}

		const session = navigator.mediaSession;
		if (session) {
			session.setActionHandler('play', () => this.toggle(true));
			session.setActionHandler('pause', () => this.toggle(false));
			session.setActionHandler('previoustrack', () => this.previous());
			session.setActionHandler('nexttrack', () => this.next());
			session.setActionHandler('seekto', (details) => details.seekTime !== undefined && this.seek(details.seekTime));
		}
		return () => {
			offs.forEach((off) => off());
			this.#channel?.close();
		};
	}

	play(songs: Song[], start = 0): void {
		if (!songs.length) return;
		this.queue = [...songs];
		this.#load(start, true);
		if (this.shuffling) this.#mix();
	}

	/** The same shuffle as the toggle's, so it shows as on and off puts the songs back in order. */
	shuffle(songs: Song[]): void {
		if (!songs.length) return;
		this.shuffling = true;
		this.#savePrefs();
		// Any song may open; play() mixes the rest.
		const first = Math.floor(Math.random() * songs.length);
		this.play([songs[first], ...songs.slice(0, first), ...songs.slice(first + 1)]);
	}

	playNext(song: Song): void {
		if (!this.current) return this.play([song]);
		this.queue.splice(this.index + 1, 0, song);
		this.#save();
	}

	append(song: Song): void {
		if (!this.current) return this.play([song]);
		this.queue.push(song);
		this.#save();
	}

	jump(index: number): void {
		this.#load(index, true);
	}

	remove(index: number): void {
		if (index === this.index) return;
		this.queue.splice(index, 1);
		if (index < this.index) this.index--;
		this.#save();
	}

	/** Drop everything after the current song. */
	clear(): void {
		this.queue.splice(this.index + 1);
		this.#save();
	}

	toggle(play = !this.playing): void {
		const audio = this.#audio;
		if (!audio || !this.current) return;
		if (!play) {
			this.#wanted = this.waiting = false;
			return audio.pause();
		}
		// A failed load leaves the element dead: set the source again, at the same spot.
		if (audio.error) return this.#load(this.index, true, this.time);
		this.#wanted = this.waiting = true;
		this.#play();
	}

	next(): void {
		if (this.index < this.queue.length - 1) this.#load(this.index + 1, true);
		else if (this.repeat !== 'off') this.#load(0, true);
	}

	previous(): void {
		if (this.time > 3 || this.index <= 0) this.seek(0);
		else this.#load(this.index - 1, true);
	}

	seek(seconds: number): void {
		if (!this.#audio) return;
		this.#audio.currentTime = seconds;
		this.time = seconds;
		this.#position();
	}

	seekBy(delta: number): void {
		if (this.current) this.seek(Math.max(0, Math.min(this.time + delta, this.duration || 0)));
	}

	setVolume(volume: number): void {
		this.volume = volume;
		this.muted = false;
		this.#sound();
	}

	/** The slider at zero is as silent as muted, so the button undoes either. */
	toggleMute(): void {
		const silent = this.muted || !this.volume;
		this.muted = !silent;
		if (!this.volume) this.volume = 0.5;
		this.#sound();
	}

	cycleRepeat(): void {
		this.repeat = this.repeat === 'off' ? 'all' : this.repeat === 'all' ? 'one' : 'off';
		this.#savePrefs();
	}

	toggleShuffle(): void {
		this.shuffling = !this.shuffling;
		this.#mix();
		this.#savePrefs();
	}

	/** Reorder what comes after the current song: at random while shuffling, else back as it was. */
	#mix(): void {
		const rest = this.queue.slice(this.index + 1);
		let order: Song[];
		if (this.shuffling) {
			this.#straight = rest;
			order = shuffled(rest);
		} else {
			// Songs added since the shuffle have no old place: they go first.
			const left = new Set(rest);
			const before = this.#straight.filter((song) => left.delete(song));
			order = [...left, ...before];
		}
		this.queue.splice(this.index + 1, rest.length, ...order);
		this.#save();
	}

	#load(index: number, autoplay: boolean, at = 0): void {
		const audio = this.#audio;
		this.index = index;
		const song = this.current;
		if (!audio || !song) return;
		const load = ++this.#loads;
		audio.src = streamUrl(song.id);
		audio.volume = this.volume * level(song);
		this.time = at;
		this.duration = song.duration ?? 0;
		// From the top is a new listen; from a saved spot it is the same one going on.
		if (!at) {
			this.#listened = 0;
			this.#scrobbled = this.#announced = false;
		}
		// Only while this is still the song: a tap on another one must not inherit the spot.
		if (at) audio.addEventListener('loadedmetadata', () => load === this.#loads && (audio.currentTime = at), { once: true });
		this.#wanted = this.waiting = autoplay;
		if (autoplay) this.#play();
		// No pause event comes when a new source replaces a playing one (or, in WebKit, a failed one).
		else this.playing = false;
		if (navigator.mediaSession) {
			const art = coverUrl(song.coverArt, 600);
			navigator.mediaSession.metadata = new MediaMetadata({
				title: song.title,
				artist: song.artist ?? '',
				album: song.album ?? '',
				artwork: art ? [{ src: art, sizes: '600x600', type: 'image/jpeg' }] : []
			});
		}
		this.#save();
	}

	#play(): void {
		// Other rejections are a newer load taking over (ignore) or a failed one (the error event).
		this.#audio!.play().catch((error: Error) => {
			if (error.name === 'NotAllowedError') this.#wanted = this.waiting = false;
		});
	}

	#ended(): void {
		if (this.repeat === 'one') this.#load(this.index, true);
		else if (this.hasNext) this.next();
		// The queue ran out: back to its first song, ready to go again.
		else this.#load(0, false);
	}

	/**
	 * The stream would not load. Asking for its first byte says why, and that
	 * decides what happens: signed out → sign in again (api() does that), this
	 * one file → skip it, several in a row or no network → stop where the
	 * listener was, and Play tries again.
	 */
	async #failed(): Promise<void> {
		const audio = this.#audio!;
		const song = this.current;
		this.waiting = false;
		// A restored, paused queue just waits.
		if (!song || !this.#wanted) return;
		const load = this.#loads;
		const status = await api(streamUrl(song.id), { headers: { range: 'bytes=0-0' } }).then(
			(response) => response.status,
			() => 0
		);
		if (load !== this.#loads || status === 401) return;
		const reachable = status > 0 && status < 500;
		this.#failedAt ??= this.index;
		if (reachable && ++this.#failures < 3 && this.hasNext) {
			notify(`Couldn't play “${song.title}” — skipped`);
			return this.next();
		}
		const from = this.#failedAt;
		this.#failures = 0;
		this.#failedAt = undefined;
		if (from !== this.index) this.#load(from, false);
		else {
			this.#wanted = this.playing = false;
			audio.pause();
			this.#save();
		}
		notify(reachable ? `Couldn't play “${this.current?.title}”` : "Can't reach the library", 6000);
	}

	#tick(): void {
		const audio = this.#audio!;
		const heard = audio.currentTime - this.time;
		if (heard > 0 && heard < 2) this.#listened += heard;
		this.time = audio.currentTime;
		const song = this.current;
		// Counts as played at half the song or four minutes of listening, like Last.fm.
		if (song && !this.#scrobbled && this.duration && this.#listened >= Math.min(this.duration / 2, 240)) {
			this.#scrobbled = true;
			post('/api/scrobble', { id: song.id, submission: true });
		}
		if (Date.now() - this.#savedAt > 5000) this.#save();
	}

	#position(): void {
		if (!this.duration || !navigator.mediaSession?.setPositionState) return;
		try {
			navigator.mediaSession.setPositionState({
				duration: this.duration,
				position: Math.min(this.time, this.duration),
				playbackRate: 1
			});
		} catch {
			// Some browsers throw on a position a hair past the duration.
		}
	}

	#sound(): void {
		if (!this.#audio) return;
		this.#audio.volume = this.volume * level(this.current);
		this.#audio.muted = this.muted;
		this.#savePrefs();
	}

	#savePrefs(): void {
		store(PREFS, { volume: this.volume, muted: this.muted, repeat: this.repeat, shuffling: this.shuffling } satisfies Prefs);
	}

	#save(): void {
		this.#savedAt = Date.now();
		store(SAVED, {
			queue: this.queue.slice(0, 1000),
			index: this.index,
			time: this.time,
			listened: this.#listened,
			scrobbled: this.#scrobbled,
			straight: this.shuffling ? this.#straight.map((song) => song.id) : undefined
		} satisfies Saved);
	}

	#restore(): void {
		const saved = stored<Saved>(SAVED);
		if (!saved?.queue?.length) return;
		this.queue = saved.queue;
		const index = Math.max(0, Math.min(saved.index, saved.queue.length - 1));
		// The order from before the shuffle: each id claims one of the songs still to come.
		const rest = this.queue.slice(index + 1);
		this.#straight = (saved.straight ?? []).flatMap((id) => {
			const at = rest.findIndex((song) => song.id === id);
			return at < 0 ? [] : rest.splice(at, 1);
		});
		this.#load(index, false, saved.time || 0);
		// The listen carries over the reload, so it is not counted twice.
		this.#listened = saved.listened || 0;
		this.#scrobbled = saved.scrobbled === true;
	}
}

export const player = new Player();

/* Favourites: the server's `starred` plus what was toggled since the page loaded. */
const stars = new SvelteMap<string, boolean>();

export const isStarred = (item: { id: string; starred?: string }) => stars.get(item.id) ?? Boolean(item.starred);

export async function toggleStar(item: { id: string; starred?: string }): Promise<void> {
	const star = !isStarred(item);
	stars.set(item.id, star);
	if (await post('/api/star', { id: item.id, star })) return;
	stars.set(item.id, !star);
	notify("Couldn't save that favourite");
}

export function formatTime(seconds: number | undefined): string {
	const s = Math.max(0, Math.floor(seconds ?? 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const pad = (n: number) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
