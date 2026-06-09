<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FrameId } from '@zaur/sprite';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';

	interface Props {
		title: string;
		tagline?: string;
		sprite?: FrameId;
		blinks?: boolean;
		children: Snippet;
		footer?: Snippet;
		lead?: Snippet;
	}

	let {
		title,
		tagline,
		sprite = 'happy',
		blinks = sprite === 'happy',
		children,
		footer,
		lead
	}: Props = $props();
</script>

<div class="z-auth-page">
	<div class="z-auth-card">
		<div class="z-auth-hero z-auth-hero--compact">
			<div class="z-auth-sprite" aria-hidden="true">
				<ZaurSprite id={sprite} scale={5} {blinks} />
			</div>
			<h1 class="z-type-brand z-auth-brand">{title}</h1>
			{#if tagline}
				<p class="z-auth-tagline">{tagline}</p>
			{/if}
		</div>

		{#if lead}
			{@render lead()}
		{/if}

		{@render children()}

		{#if footer}
			<p class="z-auth-aside">
				{@render footer()}
			</p>
		{/if}
	</div>
</div>
