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
				No hover handlers here on purpose: Ark's Toaster (the group) already
				pauses every toast in the placement on region pointer-enter/focus, and
				resumes on leave. Adding per-toast pause/resume would fight that — a
				pointerleave here could resume a toast the group still holds paused.
				The root's [data-paused] reflects that shared state and freezes the
				decorative fill (see status-line.css).
			-->
			<Toast.Root
				class="z-status-line__item{timed ? ' z-status-line__item--timed' : ''}"
				data-variant={toast().type}
			>
				{#if timed}
					<!-- Decorative countdown, driven by the toast duration. [data-paused]
					     (set by Ark whenever the timer is held — hover, focus, or idle tab)
					     freezes it in status-line.css. -->
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
