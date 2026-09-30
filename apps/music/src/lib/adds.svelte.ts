/**
 * What this person is adding to the library, and the calls that add: a video
 * (link or ID), a whole album, a retry. Search and the album page share it.
 */
import { api } from '#lib/api';
import type { AddJob } from '#lib/types';

export const isLink = (text: string) => /https?:\/\/\S/.test(text);
export const pending = (job: AddJob) => job.status === 'queued' || job.status === 'downloading';
// The download is in; ffmpeg is tagging the file.
export const finishing = (job: AddJob) => job.status === 'downloading' && job.progress === 100;

class Adds {
	/** Newest first. */
	jobs = $state<AddJob[]>([]);
	sending = $state(false);
	problem = $state('');
	#polling = false;

	/** The newest job for each video. */
	byVideo = $derived(new Map(this.jobs.toReversed().flatMap((job) => (job.videoId ? [[job.videoId, job] as const] : []))));

	async refresh(): Promise<void> {
		const response = await api('/api/add').catch(() => null);
		if (response?.ok) this.jobs = await response.json();
		this.#poll();
	}

	// Again every second and a half while something is queued or downloading.
	#poll() {
		if (this.#polling || !this.jobs.some(pending)) return;
		this.#polling = true;
		setTimeout(() => {
			this.#polling = false;
			void this.refresh();
		}, 1500);
	}

	/** POST to /api/add…; the answer's message, if it did not work, is the problem shown. */
	async #send(path: string, body: unknown): Promise<Response | null> {
		this.problem = '';
		this.sending = true;
		try {
			const response = await api(path, {
				method: 'POST',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: JSON.stringify(body)
			}).catch(() => null);
			if (!response?.ok) {
				this.problem = (await response?.json().catch(() => null))?.message ?? 'That did not work. Try again?';
				return null;
			}
			return response;
		} finally {
			this.sending = false;
		}
	}

	/** A link, or a video's ID. */
	async add(input: string): Promise<boolean> {
		const ok = !!(await this.#send('/api/add', { url: input }));
		if (ok) await this.refresh();
		return ok;
	}

	async retry(job: AddJob): Promise<void> {
		if (await this.#send('/api/add', { retry: job.id })) await this.refresh();
	}

	/** A Deezer album's songs the library lacks. How many that is, or null when it did not work. */
	async addAlbum(id: number): Promise<number | null> {
		const response = await this.#send('/api/add/album', { id });
		if (!response) return null;
		const { queued, jobs } = (await response.json()) as { queued: number; jobs: AddJob[] };
		this.jobs = jobs;
		this.#poll();
		return queued;
	}

	async dismiss(job: AddJob): Promise<boolean> {
		const response = await api(`/api/add?id=${encodeURIComponent(job.id)}`, { method: 'DELETE' }).catch(() => null);
		if (response?.ok) this.jobs = await response.json();
		return !!response?.ok;
	}
}

export const adds = new Adds();
