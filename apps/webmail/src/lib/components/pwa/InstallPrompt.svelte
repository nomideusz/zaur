<script lang="ts">
	import Download from '$lib/components/icons/Download.svelte';
import Smartphone from '$lib/components/icons/Smartphone.svelte';
import X from '$lib/components/icons/X.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { cn } from '$lib/utils/cn';

	let installing = $state(false);

	async function install() {
		installing = true;
		try {
			await pwa.install();
		} finally {
			installing = false;
		}
	}
</script>

{#if pwa.showPrompt && !pwa.isInstalled}
	<div
		class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
		role="region"
		aria-label="Install app"
	>
		<div
			class={cn(
				'pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 shadow-lg',
				'dark:bg-surface'
			)}
		>
			<div
				class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"
				aria-hidden="true"
			>
				{#if pwa.showIosHint}
					<Smartphone class="size-5" />
				{:else}
					<Download class="size-5" />
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium text-fg">Install ZAUR Webmail</p>
				{#if pwa.showIosHint}
					<p class="mt-1 text-xs leading-relaxed text-fg-muted">
						Add this app to your home screen: tap <strong class="font-medium text-fg">Share</strong>,
						then <strong class="font-medium text-fg">Add to Home Screen</strong>.
					</p>
				{:else}
					<p class="mt-1 text-xs leading-relaxed text-fg-muted">
						Install for quick access, offline support, and background mail notifications.
					</p>
				{/if}

				<div class="mt-3 flex flex-wrap items-center gap-2">
					{#if pwa.canInstall && !pwa.showIosHint}
						<button
							type="button"
							class="z-btn-primary px-3 py-1.5 text-sm"
							disabled={installing}
							onclick={() => void install()}
						>
							{installing ? 'Installing…' : 'Install app'}
						</button>
					{/if}
					<button type="button" class="z-btn-ghost px-3 py-1.5 text-sm" onclick={() => pwa.dismissPrompt()}>
						Not now
					</button>
				</div>
			</div>

			<IconButton class="!p-1" label="Dismiss install prompt" onclick={() => pwa.dismissPrompt()}>
				<X class="size-4" />
			</IconButton>
		</div>
	</div>
{/if}
