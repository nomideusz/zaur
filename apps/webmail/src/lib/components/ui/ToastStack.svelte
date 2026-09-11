<script lang="ts">
	import { Toast, Toaster } from '@ark-ui/svelte/toast';
	import { Portal } from '@ark-ui/svelte/portal';
	import { toaster } from '$lib/stores/toast.svelte';
</script>

<Portal>
	<Toaster {toaster}>
		{#snippet children(toast)}
			{@const timed = !!toast().action}
			<!--
				Hovering a timed toast (Undo) holds its dismissal — reaching for the
				button shouldn't race the countdown. Ark only pauses on page idle by
				default, so we drive it here; the root's [data-paused] then freezes
				the decorative fill (see status-line.css).
			-->
			<Toast.Root
				class="z-status-line__item{timed ? ' z-status-line__item--timed' : ''}"
				data-variant={toast().type}
				onpointerenter={timed ? () => toaster.pause(toast().id) : undefined}
				onpointerleave={timed ? () => toaster.resume(toast().id) : undefined}
			>
				{#if timed}
					<!-- Decorative countdown, driven by the toast duration. The fill pauses
					     via [data-paused] in status-line.css, so it stays in step with the
					     dismissal timer below. -->
					<div
						class="z-status-line__shape-fill"
						style:animation-duration="{toast().duration ?? 0}ms"
						aria-hidden="true"
					></div>
				{/if}
				<div class="z-status-line__content">
					<Toast.Title class="z-status-line__message">{toast().title}</Toast.Title>
					{#if toast().action}
						<Toast.ActionTrigger class="z-status-line__action">
							{toast().action?.label}
						</Toast.ActionTrigger>
					{/if}
				</div>
			</Toast.Root>
		{/snippet}
	</Toaster>
</Portal>
