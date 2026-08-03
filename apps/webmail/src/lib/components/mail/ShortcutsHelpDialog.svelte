<script lang="ts">
	import { Dialog } from '@ark-ui/svelte/dialog';
	import { Portal } from '@ark-ui/svelte/portal';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = false, onOpenChange }: Props = $props();

	const rows: { label: string; keys: string }[] = [
		{ label: 'Move list cursor', keys: 'j · k' },
		{ label: 'Open cursor / thread', keys: 'Enter · o' },
		{ label: 'Toggle select at cursor', keys: 'x' },
		{ label: 'Range select while moving', keys: 'Shift+j · Shift+k' },
		{ label: 'Select all / none / unseen / seen', keys: '* a · * n · * u · * r' },
		{ label: 'Mark seen / toggle unseen', keys: 's · u' },
		{ label: 'Archive / trash', keys: 'e · #' },
		{ label: 'Compose / search / settings', keys: 'c · / · ,' },
		{ label: 'Go to folder', keys: 'g i · g s · g d · g a · g t · g j' },
		{ label: 'Reply / reply all / forward', keys: 'r · a · f' },
		{ label: 'Highlight (reader)', keys: 'u · d' },
		{ label: 'Back / clear selection', keys: 'Esc' },
		{ label: 'This help', keys: '?' }
	];
</script>

<Dialog.Root {open} onOpenChange={(details) => onOpenChange?.(details.open)} lazyMount unmountOnExit>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
		<Dialog.Positioner class="fixed inset-0 z-[60] flex items-center justify-center p-4">
			<Dialog.Content
				class="flex max-h-[min(36rem,calc(100dvh-2rem))] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
			>
				<div class="flex items-start justify-between gap-3">
					<Dialog.Title class="text-base font-semibold text-fg">Keyboard shortcuts</Dialog.Title>
					<Dialog.CloseTrigger
						class="rounded-md px-2 py-1 text-sm text-fg-muted hover:bg-surface-sunken hover:text-fg"
					>
						Esc
					</Dialog.CloseTrigger>
				</div>
				<Dialog.Description class="sr-only">
					Reference for mail list triage and reader shortcuts.
				</Dialog.Description>
				<div class="min-h-0 flex-1 overflow-y-auto">
					<ul class="flex flex-col gap-2">
						{#each rows as row (row.label)}
							<li class="flex items-baseline justify-between gap-4 text-sm">
								<span class="text-fg-muted">{row.label}</span>
								<span class="shrink-0 font-mono text-xs text-fg tabular-nums">{row.keys}</span>
							</li>
						{/each}
					</ul>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
