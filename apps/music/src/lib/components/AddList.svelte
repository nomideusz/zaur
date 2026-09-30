<script lang="ts">
	import { tick } from 'svelte';
	import { adds, finishing } from '#lib/adds.svelte';
	import { formatTime } from '#lib/player.svelte';
	import type { AddJob, YouTubeResult } from '#lib/types';
	import Icon from './Icon.svelte';

	/** YouTube's videos, each with its Add button; without them, what this person is adding. */
	let { videos }: { videos?: YouTubeResult[] } = $props();

	async function dismiss(job: AddJob, { currentTarget, detail }: MouseEvent) {
		const row = (currentTarget as HTMLElement).closest('li')!;
		const list = row.parentElement!;
		const at = [...list.children].indexOf(row);
		if (!(await adds.dismiss(job))) return;
		// The row takes the focus with it. For someone on the keyboard (detail is 0 for a key press)
		// it goes to the row that came up into its place, or back to the field.
		if (detail) return;
		await tick();
		// (When it was the last row the whole list has gone, still holding it.)
		const next = list.isConnected && (list.children[at] ?? list.lastElementChild)?.querySelector<HTMLElement>('button, a');
		(next || document.querySelector<HTMLElement>('input[type="search"]'))?.focus();
	}
</script>

{#if videos}
	<ul class="jobs">
		{#each videos as result (result.videoId)}
			{@const job = adds.byVideo.get(result.videoId)}
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
					<button class="btn-tactile tall" type="button" disabled={adds.sending} onclick={() => adds.add(result.videoId)}>
						{job ? 'Retry' : 'Add'}
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<ul class="jobs">
		{#each adds.jobs as job (job.id)}
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
						{:else if job.status === 'downloading' && !job.videoId}Looking on YouTube…
						{:else if job.status === 'downloading'}Downloading{job.progress !== undefined ? ` · ${job.progress}%` : '…'}
						{:else if job.status === 'failed'}{job.error ?? 'Failed'}
						{:else}{job.error ?? `Added${job.artist ? ` · ${job.artist}` : ''}${job.album && job.album !== job.title ? ` · ${job.album}` : ''}`}{/if}
					</span>
					{#if job.status === 'downloading' && job.videoId}
						<span class="bar"><span style="width: {job.progress ?? 0}%"></span></span>
					{/if}
				</span>
				{#if job.status === 'done' && job.title}
					<a class="link" href="/search?q={encodeURIComponent(job.title)}">Find it</a>
				{:else if job.status === 'failed'}
					<button class="btn-tactile tall" type="button" disabled={adds.sending} onclick={() => adds.retry(job)}>Retry</button>
					<button class="z-icon-btn dismiss" type="button" aria-label="Dismiss" title="Dismiss" onclick={(event) => dismiss(job, event)}>
						<Icon name="close" />
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
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
