<script lang="ts">
	import { onMount } from 'svelte';
	import { FloatingPanel } from '@ark-ui/svelte/floating-panel';
	import type { FloatingPanelAnchorPositionDetails } from '@ark-ui/svelte/floating-panel';
	import { Portal } from '@ark-ui/svelte/portal';
	import ComposePanel from '$lib/components/mail/ComposePanel.svelte';
	import { compose } from '$lib/stores/compose.svelte';

	interface Props {
		boundaryEl: HTMLElement | null;
	}

	let { boundaryEl }: Props = $props();

	let open = $state(false);
	let position = $state<{ x: number; y: number } | undefined>(undefined);
	let size = $state<{ width: number; height: number } | undefined>(undefined);
	let stage = $state<string>('default');

	const status = $derived(
		[
			open ? 'open' : 'closed',
			stage !== 'default' ? stage : null,
			size ? `${Math.round(size.width)}×${Math.round(size.height)}` : null,
			position ? `@ ${Math.round(position.x)}, ${Math.round(position.y)}` : null
		]
			.filter(Boolean)
			.join(' · ')
	);

	onMount(() => {
		void compose.restoreOrStartNew();
	});

	function anchorNearTrigger(details: FloatingPanelAnchorPositionDetails) {
		const trigger = details.triggerRect;
		const boundary = details.boundaryRect;
		if (!trigger) return { x: 24, y: 96 };
		const panelWidth = size?.width ?? 520;
		const maxX = boundary ? boundary.width - panelWidth - 8 : trigger.x;
		const x = Math.min(Math.max(trigger.x, 8), maxX);
		return {
			x,
			y: trigger.y + trigger.height + 12
		};
	}
</script>

<FloatingPanel.Root
	bind:open
	bind:position
	bind:size
	persistRect
	closeOnEscape
	lazyMount
	unmountOnExit
	defaultSize={{ width: 520, height: 640 }}
	minSize={{ width: 360, height: 320 }}
	maxSize={{ width: 920, height: 860 }}
	getBoundaryEl={() => boundaryEl}
	getAnchorPosition={anchorNearTrigger}
	onStageChange={(details) => {
		stage = details.stage;
	}}
	onOpenChange={(details) => {
		if (details.open) void compose.restoreOrStartNew();
	}}
>
	<FloatingPanel.Trigger
		class="z-mail-text-nav__action z-mail-text-nav__action--pill"
		data-testid="floating-compose-open"
	>
		New message
	</FloatingPanel.Trigger>

	<Portal>
		<FloatingPanel.Positioner class="z-floating-compose-panel">
			{#snippet asChild(posProps)}
				<div {...posProps()} class="z-floating-compose-panel__positioner">
					<FloatingPanel.Content>
						{#snippet asChild(contentProps)}
							<div
								{...contentProps()}
								class="z-floating-compose-panel__content flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl"
							>
								<FloatingPanel.DragTrigger>
									{#snippet asChild(dragProps)}
										<div
											{...dragProps()}
											class="z-floating-compose-panel__header flex shrink-0 cursor-grab items-center gap-2 border-b border-border/80 bg-surface-sunken/40 px-3 py-2 active:cursor-grabbing"
										>
											<FloatingPanel.Title class="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
												New message
											</FloatingPanel.Title>
											<FloatingPanel.Control class="flex shrink-0 items-center gap-0.5">
												<FloatingPanel.StageTrigger
													stage="minimized"
													class="z-floating-compose-panel__stage-btn"
													aria-label="Minimize compose panel"
													title="Minimize"
												>
													<span aria-hidden="true">−</span>
												</FloatingPanel.StageTrigger>
												<FloatingPanel.StageTrigger
													stage="maximized"
													class="z-floating-compose-panel__stage-btn"
													aria-label="Maximize compose panel"
													title="Maximize"
												>
													<span aria-hidden="true">□</span>
												</FloatingPanel.StageTrigger>
												<FloatingPanel.StageTrigger
													stage="default"
													class="z-floating-compose-panel__stage-btn"
													aria-label="Restore compose panel"
													title="Restore"
												>
													<span aria-hidden="true">⧉</span>
												</FloatingPanel.StageTrigger>
												<FloatingPanel.CloseTrigger
													class="z-floating-compose-panel__stage-btn"
													aria-label="Close compose panel"
													title="Close"
													data-testid="floating-compose-close"
												>
													<span aria-hidden="true">×</span>
												</FloatingPanel.CloseTrigger>
											</FloatingPanel.Control>
										</div>
									{/snippet}
								</FloatingPanel.DragTrigger>

								<FloatingPanel.Body class="flex min-h-0 flex-1 flex-col overflow-hidden">
									{#snippet asChild(bodyProps)}
										<!-- z-mail-view scopes the compose styles, matching the real mail shell. -->
										<div {...bodyProps()} class="z-mail-view flex min-h-0 flex-1 flex-col overflow-hidden">
											<ComposePanel embedded onDismiss={() => (open = false)} />
										</div>
									{/snippet}
								</FloatingPanel.Body>

								<FloatingPanel.ResizeTrigger
									axis="se"
									class="z-floating-compose-panel__resize"
									aria-label="Resize compose panel"
								/>
							</div>
						{/snippet}
					</FloatingPanel.Content>
				</div>
			{/snippet}
		</FloatingPanel.Positioner>
	</Portal>
</FloatingPanel.Root>

<p class="mt-3 text-xs text-fg-muted" data-testid="floating-compose-status">{status}</p>

<style>
	:global(.z-floating-compose-panel__positioner) {
		z-index: 40;
	}

	:global(.z-floating-compose-panel__content) {
		width: var(--width);
		height: var(--height);
	}

	:global(.z-floating-compose-panel__stage-btn) {
		display: inline-grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: var(--radius-md);
		color: var(--z-fg-muted);
		transition:
			color 150ms ease,
			background-color 150ms ease;
	}

	:global(.z-floating-compose-panel__stage-btn:hover) {
		color: var(--z-fg);
		background-color: color-mix(in srgb, var(--z-surface-sunken) 70%, transparent);
	}

	:global(.z-floating-compose-panel__resize) {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 1rem;
		height: 1rem;
		cursor: nwse-resize;
	}

	:global(.z-floating-compose-panel__resize::after) {
		content: '';
		position: absolute;
		right: 3px;
		bottom: 3px;
		width: 8px;
		height: 8px;
		border-right: 2px solid var(--z-border);
		border-bottom: 2px solid var(--z-border);
		opacity: 0.8;
	}
</style>
