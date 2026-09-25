<script lang="ts">
	import { messageOf } from '#lib/errors';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';
	import { whoami } from '../../../session.remote';
	import { identities, updateIdentity, type IdentityDTO } from '../../../settings.remote';

	const who = whoami();
	const identitiesResource = $derived(who.current ? identities() : undefined);
	const list = $derived(identitiesResource?.current ?? []);

	let status = $state<{ text: string; error?: boolean } | null>(null);
	let filter = $state('');
	const shown = $derived.by(() => {
		const needle = filter.trim().toLowerCase();
		if (!needle) return list;
		return list.filter((row) => row.email.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle));
	});

	/** One address open at a time; the rest read as a line each. */
	let open = $state<{ id: string; name: string; signature: string } | null>(null);
	let saving = $state(false);
	const openRow = $derived(open ? list.find((row) => row.id === open!.id) : undefined);
	const dirty = $derived(!!open && !!openRow && (open.name !== openRow.name || open.signature !== openRow.signature));

	function toggle(row: IdentityDTO) {
		open = open?.id === row.id ? null : { id: row.id, name: row.name, signature: row.signature };
	}

	async function save() {
		if (!open) return;
		saving = true;
		status = null;
		try {
			await updateIdentity({ identityId: open.id, name: open.name, signature: open.signature });
			status = { text: `Saved ${openRow?.email ?? ''}` };
			open = null;
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not save'), error: true };
		} finally {
			saving = false;
		}
	}

	/** Aliases mostly want what the primary has; one click instead of one form each. */
	async function applyToAll() {
		if (!open) return;
		const { name, signature } = open;
		if (!confirm(`Use this name and signature on all ${list.length} addresses?`)) return;
		saving = true;
		status = null;
		try {
			await Promise.all(list.map((row) => updateIdentity({ identityId: row.id, name, signature })));
			status = { text: `Saved on all ${list.length} addresses` };
			open = null;
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not save every address'), error: true };
		} finally {
			saving = false;
		}
	}

	function firstLine(text: string): string {
		return text.split('\n').find((line) => line.trim() && line.trim() !== '--')?.trim() ?? '';
	}
</script>

<StatusNote {status} />

<section class="z-card">
	<div class="z-card-head justify-between">
		<h2>{list.length > 1 ? `${list.length} addresses` : 'Your address'}</h2>
		{#if list.length > 6}
			<input
				type="search"
				bind:value={filter}
				placeholder="Find an address"
				aria-label="Find an address"
				class="z-field !h-[30px] w-[200px] max-md:w-[150px] max-md:text-base"
			/>
		{/if}
	</div>

	{#if identitiesResource?.error}
		<p class="z-card-body text-[13px] text-[var(--z-ch-discard-ink)]">Could not load your addresses.</p>
	{:else if !identitiesResource?.current}
		<div class="z-card-body z-skeleton flex flex-col gap-2.5" aria-hidden="true">
			<div class="h-[40px] rounded-[8px] bg-[var(--z-sunken)]"></div>
			<div class="h-[40px] rounded-[8px] bg-[var(--z-sunken)]"></div>
		</div>
	{:else}
		<ul class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]" role="list">
			{#each shown as row (row.id)}
				{@const isOpen = open?.id === row.id}
				{@const line = firstLine(row.signature)}
				<li class={isOpen ? 'bg-[var(--z-canvas)]' : ''}>
					<button
						type="button"
						class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--z-hover)]"
						aria-expanded={isOpen}
						onclick={() => toggle(row)}
					>
						<span class="z-avatar !size-8 !text-[11px]" style={identityStyle(row.email)} aria-hidden="true">
							{initials(row.name, row.email)}
						</span>
						<span class="min-w-0 flex-1">
							<span class="flex items-center gap-2">
								<span class="truncate text-[13.5px] font-semibold text-[var(--z-ink)]">{row.email}</span>
								{#if row.id === list[0]?.id && list.length > 1}
									<span class="z-chip shrink-0 !normal-case !tracking-normal">Primary</span>
								{/if}
							</span>
							<span class="block truncate text-[12px] text-[var(--z-muted)]">
								{row.name || 'No name — recipients see the address'}{#if line}<span class="text-[var(--z-soft)]">{` · ${line}`}</span>{/if}
							</span>
						</span>
						<svg class="size-3.5 shrink-0 text-[var(--z-faint)] transition-transform {isOpen ? 'rotate-90' : ''}" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>

					{#if isOpen && open}
						<div class="flex flex-col gap-3 px-4 pt-1 pb-4">
							<label class="block">
								<span class="block text-[12px] text-[var(--z-soft)]">Name recipients see</span>
								<input
									type="text"
									maxlength="120"
									bind:value={open.name}
									placeholder="Your name"
									class="z-field mt-1 w-full max-md:text-base"
									onkeydown={(event) => {
										if (event.key === 'Enter' && dirty) void save();
										if (event.key === 'Escape') open = null;
									}}
								/>
							</label>
							<label class="block">
								<span class="block text-[12px] text-[var(--z-soft)]">Signature</span>
								<textarea
									rows="5"
									maxlength="4000"
									bind:value={open.signature}
									placeholder="Optional. Compose adds it under a “-- ” line and swaps it when you change From."
									class="z-field mt-1 !h-auto w-full resize-y py-2 font-(family-name:--font-mail-mono) text-[13px] leading-[1.5] max-md:text-base"
								></textarea>
							</label>
							<div class="flex flex-wrap items-center gap-2">
								{#if list.length > 1}
									<button type="button" class="btn-tactile !h-[30px]" disabled={saving} onclick={applyToAll}>
										Use on all {list.length} addresses
									</button>
								{/if}
								<span class="ml-auto flex gap-2">
									<button type="button" class="btn-tactile !h-[30px]" onclick={() => (open = null)}>Cancel</button>
									<button type="button" class="btn-tactile btn-primary !h-[30px]" disabled={saving || !dirty} onclick={save}>
										{saving ? 'Saving…' : 'Save'}
									</button>
								</span>
							</div>
						</div>
					{/if}
				</li>
			{:else}
				<li class="px-4 py-3 text-[12.5px] text-[var(--z-muted)]">No address matches “{filter}”.</li>
			{/each}
		</ul>
	{/if}
</section>
