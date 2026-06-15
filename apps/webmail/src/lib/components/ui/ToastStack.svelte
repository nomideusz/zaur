<script lang="ts">
	import { Toast, Toaster } from '@ark-ui/svelte/toast';
	import { Portal } from '@ark-ui/svelte/portal';
	import { toaster } from '$lib/stores/toast.svelte';
</script>

<Portal>
	<Toaster {toaster}>
		{#snippet children(toast)}
			{@const timed = !!toast().action}
			<Toast.Root
				class="z-status-line__item{timed ? ' z-status-line__item--timed' : ''}"
				data-variant={toast().type}
			>
				{#if timed}
					<!-- Decorative countdown. Driven by the toast duration; Ark pauses dismissal
					     on hover but this purely-visual fill does not — acceptable for the rare
					     case of hovering the Undo toast. -->
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
