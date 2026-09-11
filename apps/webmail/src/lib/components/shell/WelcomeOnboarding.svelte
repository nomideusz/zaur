<script lang="ts">
	import { Dialog } from '@ark-ui/svelte/dialog';
	import { Portal } from '@ark-ui/svelte/portal';
	import Field from '$lib/components/ui/Field.svelte';
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

<Dialog.Root open={shouldShow} onOpenChange={(details) => !details.open && finish(false)}>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
		<Dialog.Positioner class="fixed inset-0 z-[60] flex items-center justify-center p-4">
			<Dialog.Content
				class="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
			>
				<div class="flex min-h-0 flex-col gap-2 overflow-y-auto">
					<Dialog.Title class="text-base font-semibold text-fg">Welcome to your mail</Dialog.Title>
					<Dialog.Description class="text-sm text-fg-muted">
						Set how your messages introduce you. You can change both anytime in Settings → Account.
					</Dialog.Description>

					<!--
						Ark Field, same as every settings row: the label is the accessible
						name and the helper text is wired via aria-describedby. A wrapping
						<label> would fold the helper into the name instead.
					-->
					<Field
						id="onboarding-name"
						ids={{}}
						label="Your name"
						description="Shown to recipients on messages you send."
						class="mt-3 flex flex-col gap-1.5"
						labelClass="text-sm font-medium text-fg"
						descriptionClass="text-xs text-fg-subtle"
					>
						{#snippet children({ controlId })}
							<input
								id={controlId}
								type="text"
								class="z-input"
								placeholder={auth.username ?? 'Your name'}
								bind:value={name}
							/>
						{/snippet}
					</Field>

					<Field
						id="onboarding-signature"
						ids={{}}
						label="Signature (optional)"
						description="Added under “--” at the end of new messages — edit or delete it right in the message."
						class="mt-2 flex flex-col gap-1.5"
						labelClass="text-sm font-medium text-fg"
						descriptionClass="text-xs text-fg-subtle"
					>
						{#snippet children({ controlId })}
							<textarea
								id={controlId}
								rows="3"
								class="z-input resize-none"
								placeholder={'Best,\n' + (name.trim() || 'Your name')}
								bind:value={signature}
							></textarea>
						{/snippet}
					</Field>
				</div>

				<div class="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<button
						type="button"
						class={cn(actionBtn, 'border border-border bg-surface text-fg hover:bg-surface-sunken focus-visible:outline-accent')}
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
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
