<script lang="ts">
	import { prefs, setPref, PAGE_SIZES, UNDO_SEND_SECONDS, DEFAULT_PREFS, ACCOUNT_PREF_KEYS, type Prefs } from '#lib/settings.svelte.ts';

	type Toggle = 'markReadOnOpen' | 'showPreview' | 'showAvatars' | 'showRemoteImages' | 'unseenByDefault';
	const toggles: { key: Toggle; label: string; hint?: string }[] = [
		{ key: 'markReadOnOpen', label: 'Mark messages read when opened' },
		{ key: 'unseenByDefault', label: 'Open folders on Unseen', hint: 'The list starts filtered to what you have not read yet.' },
		{ key: 'showPreview', label: 'Show a preview line in the list' },
		{ key: 'showAvatars', label: 'Show sender avatars' },
		{
			key: 'showRemoteImages',
			label: 'Always show remote images',
			hint: "Off, pictures from the web wait for a click, so senders can't see when you open their mail."
		}
	];

	/** Only what this page shows goes back to its default; the theme and widths are Appearance's. */
	function reset() {
		for (const key of ACCOUNT_PREF_KEYS as readonly (keyof Prefs)[]) {
			if (key === 'aiCategories') continue;
			setPref(key, DEFAULT_PREFS[key] as never);
		}
	}
</script>

{#snippet row(label: string, hint: string | undefined, control: import('svelte').Snippet)}
	<div class="flex items-center justify-between gap-4 px-4 py-3 max-md:flex-wrap">
		<span class="min-w-0">
			<span class="block text-[13.5px] font-medium text-[var(--z-body)]">{label}</span>
			{#if hint}<span class="mt-[1px] block text-[12px] leading-[1.4] text-[var(--z-soft)]">{hint}</span>{/if}
		</span>
		{@render control()}
	</div>
{/snippet}

<section class="z-card">
	<h2 class="z-card-head">Reading</h2>
	<div class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]">
		{#each toggles as toggle (toggle.key)}
			<label class="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
				<span class="min-w-0">
					<span class="block text-[13.5px] font-medium text-[var(--z-body)]">{toggle.label}</span>
					{#if toggle.hint}<span class="mt-[1px] block text-[12px] leading-[1.4] text-[var(--z-soft)]">{toggle.hint}</span>{/if}
				</span>
				<input type="checkbox" class="z-check" checked={prefs[toggle.key]} onchange={(event) => setPref(toggle.key, event.currentTarget.checked)} />
			</label>
		{/each}
		{#snippet pageSize()}
			<div class="z-group" role="group" aria-label="Messages per folder">
				{#each PAGE_SIZES as size (size)}
					<button type="button" class="z-segment z-mono !h-[28px] !px-[10px] !text-[11.5px]" aria-pressed={prefs.pageSize === size} onclick={() => setPref('pageSize', size)}>
						{size}
					</button>
				{/each}
			</div>
		{/snippet}
		{@render row('Messages per folder', 'How many load at a time, and how many more each Load more brings.', pageSize)}
	</div>
</section>

<section class="z-card">
	<h2 class="z-card-head">Writing</h2>
	<div class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]">
		{#snippet startAs()}
			<div class="z-group" role="group" aria-label="New messages start as">
				{#each [{ plain: false, label: 'Rich text' }, { plain: true, label: 'Plain text' }] as mode (mode.label)}
					<button type="button" class="z-segment !h-[28px] !px-[10px] !text-[12px]" aria-pressed={prefs.composePlain === mode.plain} onclick={() => setPref('composePlain', mode.plain)}>
						{mode.label}
					</button>
				{/each}
			</div>
		{/snippet}
		{@render row('New messages start as', 'Either can be switched per message, with Plain in the compose bar.', startAs)}
		{#snippet undoSend()}
			<div class="z-group" role="group" aria-label="Undo send">
				{#each UNDO_SEND_SECONDS as seconds (seconds)}
					<button type="button" class="z-segment z-mono !h-[28px] !px-[10px] !text-[11.5px]" aria-pressed={prefs.undoSendSeconds === seconds} onclick={() => setPref('undoSendSeconds', seconds)}>
						{seconds ? `${seconds}s` : 'Off'}
					</button>
				{/each}
			</div>
		{/snippet}
		{@render row('Undo send', 'How long a sent message waits, with an Undo, before it goes.', undoSend)}
	</div>
	<div class="z-card-foot justify-end">
		<button type="button" class="btn-tactile !h-7 !text-[12px]" onclick={reset}>Reset reading and writing</button>
	</div>
</section>
