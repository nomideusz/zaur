<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';
</script>

<div class="z-status-line" aria-live="polite" aria-relevant="additions">
	{#each toast.toasts as item (item.id)}
		{@const isTimed = !!item.action}
		<div
			class="z-status-line__item"
			class:z-status-line__item--timed={isTimed}
			data-variant={item.variant}
			role="status"
		>
			{#if isTimed}
				<div
					class="z-status-line__shape-fill"
					style:animation-duration="{item.durationMs}ms"
					aria-hidden="true"
				></div>
			{/if}
			<div class="z-status-line__content">
				<p class="z-status-line__message">{item.message}</p>
				{#if item.action}
					<button
						type="button"
						class="z-status-line__action"
						onclick={() => void toast.runAction(item.id, item.action!)}
					>
						{item.action.label}
					</button>
				{/if}
			</div>
		</div>
	{/each}
</div>
