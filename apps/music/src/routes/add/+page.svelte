<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import type { AddJob } from '#lib/types';

	let link = $state('');
	let jobs = $state<AddJob[]>([]);
	let problem = $state('');
	let sending = $state(false);

	async function refresh() {
		const response = await fetch('/api/add');
		if (response.ok) jobs = await response.json();
	}

	async function add(input: string) {
		problem = '';
		sending = true;
		try {
			const response = await fetch('/api/add', {
				method: 'POST',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: JSON.stringify({ url: input })
			});
			if (!response.ok) {
				problem = (await response.json().catch(() => null))?.message ?? 'That did not work. Try again?';
				return;
			}
			link = '';
			await refresh();
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
		const shared = ['url', 'text', 'title'].map((key) => page.url.searchParams.get(key)).filter(Boolean).join(' ');
		if (shared) {
			replaceState('/add', {});
			add(shared);
		}
	});
</script>

<svelte:head><title>Add from YouTube · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head"><h1>Add from YouTube</h1></header>

	<form
		class="add"
		onsubmit={(event) => {
			event.preventDefault();
			if (link.trim()) add(link);
		}}
	>
		<input
			class="z-field"
			type="url"
			inputmode="url"
			placeholder="https://youtube.com/watch?v=… or a Bartube link"
			aria-label="Video link"
			autocomplete="off"
			bind:value={link}
		/>
		<button class="btn-tactile btn-primary tall" type="submit" disabled={sending || !link.trim()}>
			<Icon name="add" /> Add
		</button>
	</form>
	{#if problem}<p class="problem"><Icon name="alert" /> {problem}</p>{/if}
	<p class="z-caption hint">
		A YouTube, YouTube Music or Bartube link. The song's audio goes into the library, which everyone on Zaur Music
		shares, with the video's thumbnail as its cover. On Android, install Zaur Music and share from the YouTube app
		straight to it.
	</p>

	{#if jobs.length}
		<section class="section">
			<div class="section-head"><h2>Added this session</h2></div>
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
							<span class="meta">
								{#if job.status === 'queued'}Waiting…
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
							<button class="btn-tactile" type="button" onclick={() => add(job.videoId)}>Retry</button>
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
	.add input {
		flex: 1;
		min-width: 0;
		height: 36px;
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
	.meta {
		color: var(--z-soft);
		font-size: 12.5px;
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
