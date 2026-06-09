<script lang="ts">
	import AlertCircle from '$lib/components/icons/AlertCircle.svelte';
	import RefreshCw from '$lib/components/icons/RefreshCw.svelte';
	import { frameSvg, type FrameId } from '@zaur/sprite';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';

	let {
		loading = false,
		error = null,
		empty = false,
		emptyMessage = 'Nothing here yet',
		emptyHint = null as string | null,
		emptyIcon = 'inbox' as 'inbox' | 'search' | 'none',
		emptyActionHref,
		emptyActionLabel,
		mailboxRouteId,
		onRetry
	}: {
		loading?: boolean;
		error?: string | null;
		empty?: boolean;
		emptyMessage?: string;
		emptyHint?: string | null;
		emptyIcon?: 'inbox' | 'search' | 'none';
		emptyActionHref?: string;
		emptyActionLabel?: string;
		mailboxRouteId?: string;
		onRetry?: () => void;
	} = $props();

	// Easter egg state
	let isZaurAlive = $state(false);
	let activeFrame = $state<FrameId>('walk_a');
	let facing = $state<'left' | 'right'>('right');
	let xOffset = $state(0);

	let walkDirection = 1; // 1 = right, -1 = left
	let animState = 'walk'; // 'walk', 'confused', 'blink'
	let stateTicks = 0;

	$effect(() => {
		if (empty) {
			// 5% chance Zaur is alive (rare easter egg)
			isZaurAlive = Math.random() < 0.05;
			
			if (isZaurAlive) {
				activeFrame = 'walk_a';
				animState = 'walk';
				walkDirection = 1;
				facing = 'right';
				xOffset = 0;

				const interval = setInterval(() => {
					if (animState === 'walk') {
						activeFrame = activeFrame === 'walk_a' ? 'walk_b' : 'walk_a';
						xOffset += walkDirection * 12;
						
						if (walkDirection === 1 && xOffset >= 180) {
							animState = 'confused';
							activeFrame = 'surprise';
							stateTicks = 4;
						} else if (walkDirection === -1 && xOffset <= 0) {
							animState = 'blink';
							activeFrame = 'blink';
							stateTicks = 3;
						}
					} else if (animState === 'confused') {
						stateTicks--;
						if (stateTicks === 2) {
							activeFrame = 'look_up';
						}
						if (stateTicks <= 0) {
							walkDirection = -1;
							facing = 'left';
							animState = 'walk';
							activeFrame = 'walk_a';
						}
					} else if (animState === 'blink') {
						stateTicks--;
						if (stateTicks === 1) {
							activeFrame = 'idle';
						}
						if (stateTicks <= 0) {
							walkDirection = 1;
							facing = 'right';
							animState = 'walk';
							activeFrame = 'walk_a';
						}
					}
				}, 250);

				return () => clearInterval(interval);
			}
		}
	});
</script>

{#if loading}
	<LoadingIndicator label="Loading messages…" />
{:else if error}
	<div class="flex flex-col items-center gap-3 px-5 py-12 text-center">
		<div class="p-2 text-danger">
			<AlertCircle class="size-10" aria-hidden="true" />
		</div>
		<div>
			<p class="text-sm font-semibold text-fg">Messages could not load</p>
			<p class="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-fg-muted">{error}</p>
		</div>
		{#if onRetry}
			<Button variant="ghost" class="text-sm" onclick={onRetry}>
				<RefreshCw class="size-4" aria-hidden="true" />
				Try again
			</Button>
		{/if}
	</div>
{:else if empty}
	<div class="flex min-h-[350px] flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
		{#if emptyIcon !== 'none' && isZaurAlive}
			<div
				class="relative mx-auto mb-1 h-9 w-60 overflow-hidden border-b border-border/30 text-fg-subtle select-none"
			>
				<div
					class="absolute bottom-0 transition-transform duration-250 ease-linear"
					style="transform: translateX({xOffset}px);"
				>
					{@html frameSvg(activeFrame, { color: 'currentColor', scale: 2, facing })}
				</div>
			</div>
		{/if}
		<p class="text-sm font-medium text-fg">{emptyMessage}</p>
		{#if emptyHint}
			<p class="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">{emptyHint}</p>
		{/if}
		{#if emptyActionHref && emptyActionLabel}
			<a
				href={emptyActionHref}
				class="text-sm font-medium text-accent underline-offset-2 hover:underline"
			>
				{emptyActionLabel}
			</a>
		{/if}
	</div>
{/if}
