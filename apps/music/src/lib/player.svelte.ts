/**
 * The one player: a queue over the layout's <audio>, which outlives every
 * page. The queue and the spot in it survive a reload (localStorage); the
 * phone's lock screen and headphone buttons drive it through Media Session.
 */
import { SvelteMap } from 'svelte/reactivity';
import type { Song } from '#lib/types';

const SAVED = 'zaur-music.queue';

function shuffled<T>(items: T[]): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

const post = (url: string, body: unknown) =>
	fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});

export const coverUrl = (id: string | undefined, size = 300) => (id ? `/api/cover/${encodeURIComponent(id)}?size=${size}` : undefined);

class Player {
	queue = $state<Song[]>([]);
	index = $state(-1);
	playing = $state(false);
	waiting = $state(false);
	time = $state(0);
	duration = $state(0);
	/** The Now playing sheet. */
	open = $state(false);

	#audio: HTMLAudioElement | undefined;
	#scrobbled = false;
	#savedAt = 0;

	get current(): Song | undefined {
		return this.queue[this.index];
	}

	/** Called once by the layout with its <audio>; returns the teardown. */
	attach(audio: HTMLAudioElement): () => void {
		this.#audio = audio;
		this.#restore();
		const on = <K extends keyof HTMLMediaElementEventMap>(type: K, fn: () => void) => {
			audio.addEventListener(type, fn);
			return () => audio.removeEventListener(type, fn);
		};
		const offs = [
			on('play', () => (this.playing = true)),
			on('pause', () => {
				this.playing = false;
				this.#save();
			}),
			on('waiting', () => (this.waiting = true)),
			on('playing', () => (this.waiting = false)),
			on('durationchange', () => {
				this.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
				this.#position();
			}),
			on('timeupdate', () => this.#tick()),
			on('ended', () => this.next()),
			// A file Navidrome cannot serve while playing: move on rather than stall
			// the queue (a restored, paused queue just waits).
			on('error', () => {
				if (audio.src && !audio.paused) setTimeout(() => this.next(), 800);
			})
		];

		const session = navigator.mediaSession;
		if (session) {
			session.setActionHandler('play', () => this.toggle(true));
			session.setActionHandler('pause', () => this.toggle(false));
			session.setActionHandler('previoustrack', () => this.prev());
			session.setActionHandler('nexttrack', () => this.next());
			session.setActionHandler('seekto', (details) => details.seekTime !== undefined && this.seek(details.seekTime));
		}
		return () => offs.forEach((off) => off());
	}

	play(songs: Song[], start = 0): void {
		if (!songs.length) return;
		this.queue = [...songs];
		this.#load(start, true);
	}

	shuffle(songs: Song[]): void {
		this.play(shuffled(songs));
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

	toggle(play = !this.playing): void {
		const audio = this.#audio;
		if (!audio || !this.current) return;
		if (play) audio.play().catch(() => {});
		else audio.pause();
	}

	next(): void {
		if (this.index < this.queue.length - 1) this.#load(this.index + 1, true);
		else this.#audio?.pause();
	}

	prev(): void {
		if (this.time > 3 || this.index <= 0) this.seek(0);
		else this.#load(this.index - 1, true);
	}

	seek(seconds: number): void {
		if (!this.#audio) return;
		this.#audio.currentTime = seconds;
		this.time = seconds;
		this.#position();
	}

	#load(index: number, autoplay: boolean, at = 0): void {
		const audio = this.#audio;
		this.index = index;
		const song = this.current;
		if (!audio || !song) return;
		audio.src = `/api/stream/${encodeURIComponent(song.id)}`;
		this.time = at;
		this.duration = song.duration ?? 0;
		this.#scrobbled = false;
		if (at) audio.addEventListener('loadedmetadata', () => (audio.currentTime = at), { once: true });
		if (autoplay) {
			audio.play().catch(() => {});
			post('/api/scrobble', { id: song.id, submission: false });
		}
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

	#tick(): void {
		const audio = this.#audio!;
		this.time = audio.currentTime;
		const song = this.current;
		// Counts as played at half the song or four minutes, like Last.fm.
		if (song && !this.#scrobbled && this.duration && this.time >= Math.min(this.duration / 2, 240)) {
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

	#save(): void {
		this.#savedAt = Date.now();
		try {
			localStorage.setItem(SAVED, JSON.stringify({ queue: this.queue.slice(0, 1000), index: this.index, time: this.time }));
		} catch {
			// Private mode or full: the queue just won't survive a reload.
		}
	}

	#restore(): void {
		try {
			const saved = JSON.parse(localStorage.getItem(SAVED) ?? 'null') as { queue: Song[]; index: number; time: number } | null;
			if (!saved?.queue?.length) return;
			this.queue = saved.queue;
			this.#load(Math.max(0, Math.min(saved.index, saved.queue.length - 1)), false, saved.time || 0);
		} catch {
			// Nothing usable saved.
		}
	}
}

export const player = new Player();

/* Favourites: the server's `starred` plus what was toggled since the page loaded. */
const stars = new SvelteMap<string, boolean>();

export const isStarred = (item: { id: string; starred?: string }) => stars.get(item.id) ?? Boolean(item.starred);

export function toggleStar(item: { id: string; starred?: string }): void {
	const star = !isStarred(item);
	stars.set(item.id, star);
	post('/api/star', { id: item.id, star });
}

export function formatTime(seconds: number | undefined): string {
	const s = Math.max(0, Math.floor(seconds ?? 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const pad = (n: number) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
