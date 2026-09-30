<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { api } from '#lib/api';
	import Icon from '#lib/components/Icon.svelte';
	import SearchField from '#lib/components/SearchField.svelte';
	import { formatTime } from '#lib/player.svelte';
	import type { AddJob, YouTubeResult } from '#lib/types';

	let query = $state('');
	let jobs = $state<AddJob[]>([]);
	let results = $state<YouTubeResult[] | null>(null);
	let problem = $state('');
	let sending = $state(false);

	const isLink = (text: string) => /https?:\/\/\S/.test(text);
	// The download is in; ffmpeg is tagging the file.
	const finishing = (job: AddJob) => job.status === 'downloading' && job.progress === 100;
	// jobs is newest first: the newest job for a video wins.
	const jobFor = $derived(new Map(jobs.toReversed().map((job) => [job.videoId, job])));

	async function refresh() {
		const response = await api('/api/add').catch(() => null);
		if (response?.ok) jobs = await response.json();
	}

	async function dismiss(job: AddJob, { currentTarget, detail }: MouseEvent) {
		const row = (currentTarget as HTMLElement).closest('li')!;
		const list = row.parentElement!;
		const at = [...list.children].indexOf(row);
		const response = await api(`/api/add?id=${encodeURIComponent(job.id)}`, { method: 'DELETE' }).catch(() => null);
		if (!response?.ok) return;
		jobs = await response.json();
		// The row takes the focus with it. For someone on the keyboard (detail is 0 for a key press)
		// it goes to the row that came up into its place, or back to the field.
		if (detail) return;
		await tick();
		// (When it was the last row the whole list has gone, still holding it.)
		const next = list.isConnected && (list.children[at] ?? list.lastElementChild)?.querySelector<HTMLElement>('button, a');
		(next || document.querySelector<HTMLElement>('.add input'))?.focus();
	}

	async function search(words: string) {
		problem = '';
		sending = true;
		try {
			const response = await api(`/api/add/search?${new URLSearchParams({ q: words })}`).catch(() => null);
			if (!response?.ok) {
				problem = (await response?.json().catch(() => null))?.message ?? 'Search did not work. Try again?';
				return;
			}
			results = await response.json();
		} finally {
			sending = false;
		}
	}

	async function add(input: string): Promise<boolean> {
		problem = '';
		sending = true;
		try {
			const response = await api('/api/add', {
				method: 'POST',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: JSON.stringify({ url: input })
			}).catch(() => null);
			if (!response?.ok) {
				problem = (await response?.json().catch(() => null))?.message ?? 'That did not work. Try again?';
				return false;
			}
			await refresh();
			return true;
		} finally {
			sending = false;
		}
	}

	// Poll while a download is queued or running.
	$effect(() => {
		if (!jobs.some((job) => job.status === 'queued' || job.status === 'downloading')) return;
		const timer = setInterval(refresh, 1500);
		return () => clearInterval(timer);
	});

	onMount(() => {
		refresh();
		// Shared from another app through the installed app's share target: the
		// link comes as url, or inside text (YouTube's app sends it that way).
		const [url, text, title] = ['url', 'text', 'title'].map((key) => page.url.searchParams.get(key)?.trim() ?? '');
		const shared = [url, text, title].filter(Boolean).join(' ');
		if (!shared) return;
		replaceState('/add', {});
		if (isLink(shared)) return void add(shared);
		// Words with no link (a song's name shared from elsewhere): look them up. What was
		// shared, or failing that its subject line; both together find nothing.
		query = text || title;
		search(query);
	});
</script>

<svelte:head><title>Add from YouTube · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head"><h1>Add from YouTube</h1></header>

	<form
		class="add"
		onsubmit={(event) => {
			event.preventDefault();
			if (!query.trim()) return;
			if (isLink(query)) add(query).then((added) => added && (query = ''));
			else search(query.trim());
		}}
	>
		<SearchField
			class="min-w-0 flex-1"
			enterkeyhint="search"
			placeholder="Search YouTube, or paste a link"
			aria-label="Search YouTube, or paste a video link"
			bind:value={query}
		/>
		<button class="btn-tactile btn-primary tall" type="submit" disabled={sending || !query.trim()}>
			{#if isLink(query)}<Icon name="add" /> Add{:else}<Icon name="search" /> Search{/if}
		</button>
	</form>
	{#if problem}<p class="problem"><Icon name="alert" /> {problem}</p>{/if}
	<p class="z-caption hint">
		Search words, or a YouTube, YouTube Music or Bartube link. The song's audio goes into the library, which everyone on Zaur Music
		shares, with the video's thumbnail as its cover. On Android, install Zaur Music and share from the YouTube app
		straight to it.
	</p>

	{#if results}
		<section class="section">
			<div class="section-head"><h2>{results.length ? 'On YouTube' : 'Nothing found on YouTube'}</h2></div>
			<ul class="jobs">
				{#each results as result (result.videoId)}
					{@const job = jobFor.get(result.videoId)}
					<li class="job">
						<img class="thumb" src="https://i.ytimg.com/vi/{result.videoId}/mqdefault.jpg" alt="" loading="lazy" />
						<span class="text">
							<span class="title">{result.title}</span>
							<span class="meta by"><span class="who">{result.author}</span><span>{formatTime(result.seconds)}</span></span>
							{#if job?.status === 'failed'}<span class="meta why">{job.error ?? 'Failed'}</span>{/if}
						</span>
						{#if job?.status === 'done'}
							<span class="state done" title="Added"><Icon name="check" /></span>
						{:else if job && job.status !== 'failed'}
							<span class="z-caption">{job.status === 'queued' ? 'Waiting…' : finishing(job) ? 'Finishing…' : `${job.progress ?? 0}%`}</span>
						{:else}
							<button class="btn-tactile tall" type="button" disabled={sending} onclick={() => add(result.videoId)}>
								{job ? 'Retry' : 'Add'}
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if jobs.length}
		<section class="section">
			<div class="section-head"><h2>Recent adds</h2></div>
			<ul class="jobs">
				{#each jobs as job (job.id)}
					<li class="job">
						<span class="state {job.status}">
							{#if job.status === 'done'}<Icon name="check" />{:else if job.status === 'failed'}<Icon name="alert" />{:else}<Icon
									name="add"
								/>{/if}
						</span>
						<span class="text">
							<span class="title">{job.title ?? `youtu.be/${job.videoId}`}</span>
							<span class="meta" class:why={job.status === 'failed'}>
								{#if job.status === 'queued'}Waiting…
								{:else if finishing(job)}Finishing…
								{:else if job.status === 'downloading'}Downloading{job.progress !== undefined ? ` · ${job.progress}%` : '…'}
								{:else if job.status === 'failed'}{job.error ?? 'Failed'}
								{:else}{job.error ?? `Added${job.artist ? ` · ${job.artist}` : ''}`}{/if}
							</span>
							{#if job.status === 'downloading'}
								<span class="bar"><span style="width: {job.progress ?? 0}%"></span></span>
							{/if}
						</span>
						{#if job.status === 'done' && job.title}
							<a class="link" href="/search?q={encodeURIComponent(job.title)}">Find it</a>
						{:else if job.status === 'failed'}
							<button class="btn-tactile tall" type="button" disabled={sending} onclick={() => add(job.videoId)}>Retry</button>
							<button class="z-icon-btn dismiss" type="button" aria-label="Dismiss" title="Dismiss" onclick={(event) => dismiss(job, event)}>
								<Icon name="close" />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.add {
		display: flex;
		gap: 8px;
	}
	.hint {
		max-width: 60ch;
		margin: 10px 0 0;
	}
	.problem {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 10px 0 0;
		color: var(--z-danger);
	}
	.jobs {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.job {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 8px;
		border-bottom: 1px solid var(--z-hairline);
	}
	.thumb {
		width: 64px;
		height: 36px;
		flex-shrink: 0;
		border-radius: 4px;
		background: var(--z-sunken);
		object-fit: cover;
	}
	.state {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		border-radius: 999px;
		background: var(--z-sunken);
		color: var(--z-muted);
	}
	.state.done {
		background: var(--z-ch-confirmed-fill);
		color: var(--z-ch-confirmed-ink);
	}
	.state.failed {
		background: var(--z-ch-discard-fill);
		color: var(--z-ch-discard-ink);
	}
	.state.downloading {
		background: var(--z-accent-soft);
		color: var(--z-accent-ink);
	}
	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}
	.title,
	.meta {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.title {
		color: var(--z-ink);
		font-weight: 600;
	}
	/* On the narrowest phones one line is a few words, and the results read alike: two. */
	@media (max-width: 400px) {
		.title {
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			white-space: normal;
		}
	}
	/* muted, not soft: this sits on the canvas, where soft falls under 4.5:1. */
	.meta {
		color: var(--z-muted);
		font-size: 12.5px;
	}
	/* A long channel name gives way; the duration stays. */
	.by {
		display: flex;
	}
	.who {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.who::after {
		content: '·';
		margin: 0 0.35em;
	}
	/* Why it failed is read in full. */
	.why {
		white-space: normal;
	}
	/* As tall as Retry beside it. */
	.dismiss {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
	}
	@media (pointer: coarse) {
		.dismiss {
			width: 44px;
			height: 44px;
			margin: 0 -8px 0 -6px;
		}
	}
	.bar {
		height: 3px;
		margin-top: 6px;
		border-radius: 999px;
		background: var(--z-sunken);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--z-accent);
		transition: width 300ms ease;
	}
</style>
