<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	/* One-time identity setup: shown after the initial settings pull so an
	   existing user's synced name/signature never triggers it. */
	const shouldShow = $derived(
		auth.isAuthenticated &&
			!auth.isRestoring &&
			settings.accountSyncReady &&
			!settings.onboardingDone &&
			!settings.displayName.trim() &&
			!settings.signature.trim()
	);

	let name = $state('');
	let signature = $state('');
	let seeded = $state(false);

	$effect(() => {
		if (!shouldShow || seeded) return;
		name = auth.displayName?.trim() || '';
		seeded = true;
	});

	function finish(save: boolean) {
		if (save) {
			if (name.trim()) settings.setDisplayName(name.trim());
			if (signature.trim()) settings.setSignature(signature.trim());
		}
		settings.setOnboardingDone();
	}

	const actionBtn =
		'inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:w-auto';
</script>

<Dialog.Root open={shouldShow} onOpenChange={(open) => !open && finish(false)}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-[60] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
		>
			<div class="flex min-h-0 flex-col gap-2 overflow-y-auto">
				<Dialog.Title class="text-base font-semibold text-fg">Welcome to your mail</Dialog.Title>
				<Dialog.Description class="text-sm text-fg-muted">
					Set how your messages introduce you. You can change both anytime in Settings → Account.
				</Dialog.Description>

				<label class="mt-3 flex flex-col gap-1.5 text-sm">
					<span class="font-medium text-fg">Your name</span>
					<input
						type="text"
						class="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-accent"
						placeholder={auth.username ?? 'Your name'}
						bind:value={name}
					/>
					<span class="text-xs text-fg-subtle">Shown to recipients on messages you send.</span>
				</label>

				<label class="mt-2 flex flex-col gap-1.5 text-sm">
					<span class="font-medium text-fg">Signature <span class="font-normal text-fg-subtle">(optional)</span></span>
					<textarea
						rows="3"
						class="resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-accent"
						placeholder={'Best,\n' + (name.trim() || 'Your name')}
						bind:value={signature}
					></textarea>
					<span class="text-xs text-fg-subtle">
						Added under “--” at the end of new messages — edit or delete it right in the message.
					</span>
				</label>
			</div>

			<div class="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					class={cn(actionBtn, 'text-fg-muted hover:bg-surface-sunken hover:text-fg focus-visible:outline-accent')}
					onclick={() => finish(false)}
				>
					Skip
				</button>
				<button
					type="button"
					class={cn(actionBtn, 'bg-accent text-accent-fg shadow-sm hover:bg-accent-hover focus-visible:outline-accent')}
					onclick={() => finish(true)}
				>
					Save
				</button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
