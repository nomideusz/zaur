<script lang="ts">
	import { goto } from '$app/navigation';
	import { whoami } from '../../session.remote';
	import { identities, setDisplayName } from '../../settings.remote';
	import { logout } from '../../login.remote';
	import { quota } from '../../mail.remote';
	import { prefs, setPref, PAGE_SIZES, DEFAULT_PREFS, LIST_MIN, LIST_MAX } from '#lib/settings.svelte.ts';

	const session = $derived(whoami()?.current ?? null);
	const identitiesResource = $derived(session ? identities() : undefined);
	const quotaResource = $derived(session ? quota() : undefined);

	// Send-as names are edited per identity; keep the pending edits keyed by id.
	let names = $state<Record<string, string>>({});
	let saving = $state<string | null>(null);
	let status = $state<{ text: string; error?: boolean } | null>(null);

	const rows = $derived(
		(identitiesResource?.current ?? []).map((identity) => ({
			...identity,
			draft: names[identity.id] ?? identity.name
		}))
	);

	async function saveName(id: string, value: string) {
		saving = id;
		status = null;
		try {
			await setDisplayName({ identityId: id, name: value });
			await identitiesResource?.refresh();
			delete names[id];
			status = { text: 'Display name saved' };
		} catch (cause) {
			status = { text: cause instanceof Error ? cause.message : 'Could not save', error: true };
		} finally {
			saving = null;
		}
	}

	function signOut() {
		void logout().then(() => goto('/login', { replaceState: true }));
	}

	const quotaLabel = $derived.by(() => {
		const q = quotaResource?.current;
		if (!q || !q.limit) return null;
		const gb = (bytes: number) => (bytes / 1_000_000_000).toFixed(2);
		return `${gb(q.used)} GB of ${gb(q.limit)} GB used`;
	});
</script>

<svelte:head><title>Settings · Zaur Mail</title></svelte:head>

<div class="flex h-svh w-screen flex-col items-center justify-center bg-[#ebeef2] p-2 sm:p-3 overflow-hidden text-slate-900">
	<div class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-window">
		<header class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[#cbd5e1] bg-white px-4 select-none">
			<div class="flex items-center gap-1.5 pr-1" aria-hidden="true">
				<span class="mac-dot mac-dot-close"></span>
				<span class="mac-dot mac-dot-minimize"></span>
				<span class="mac-dot mac-dot-maximize"></span>
			</div>
			<div class="h-4 w-px bg-slate-200"></div>
			<a href="/" class="btn-tactile gap-1.5" data-sveltekit-preload-data="hover">
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				Mail
			</a>
			<h1 class="text-[13px] font-semibold text-slate-800">Settings</h1>
			{#if status}
				<span class="ml-auto text-[12px] font-medium {status.error ? 'text-red-600' : 'text-slate-500'}">
					{status.text}
				</span>
			{/if}
		</header>

		<div class="min-h-0 flex-1 overflow-y-auto px-6 py-6">
			<div class="mx-auto flex max-w-[640px] flex-col gap-6">
				<!-- Account -->
				<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-5 shadow-2xs">
					<h2 class="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
						Account
					</h2>
					<div class="mt-3 flex items-baseline justify-between gap-3">
						<div>
							<div class="text-[14px] font-semibold text-slate-900">
								{session?.displayName ?? session?.username ?? '—'}
							</div>
							<div class="text-[13px] text-slate-500">{session?.username ?? ''}</div>
						</div>
						<button type="button" class="btn-tactile !text-red-600" onclick={signOut}>Sign out</button>
					</div>
					{#if quotaLabel}
						<p class="mt-3 text-[12.5px] text-slate-500">{quotaLabel}</p>
					{/if}
				</section>

				<!-- Send-as display names -->
				<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-5 shadow-2xs">
					<h2 class="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
						Display name
					</h2>
					<p class="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
						The name recipients see next to each of your addresses.
					</p>
					{#if identitiesResource?.error}
						<p class="mt-3 text-[13px] text-red-600">Could not load your addresses.</p>
					{:else if !identitiesResource?.current}
						<p class="mt-3 text-[13px] text-slate-400">Loading…</p>
					{:else}
						<div class="mt-3 flex flex-col gap-3">
							{#each rows as row (row.id)}
								<div class="flex items-end gap-2">
									<label class="min-w-0 flex-1">
										<span class="block truncate text-[12px] text-slate-500">{row.email}</span>
										<input
											type="text"
											maxlength="120"
											value={row.draft}
											oninput={(event) => (names[row.id] = event.currentTarget.value)}
											onkeydown={(event) => {
												if (event.key === 'Enter') void saveName(row.id, row.draft);
											}}
											placeholder="Your name"
											class="mt-1 h-[32px] w-full rounded-[6px] border border-[#cbd5e1] bg-white px-2.5 text-[13px] shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
										/>
									</label>
									<button
										type="button"
										class="btn-tactile !h-[32px]"
										disabled={saving === row.id || row.draft === row.name}
										onclick={() => void saveName(row.id, row.draft)}
									>
										{saving === row.id ? 'Saving…' : 'Save'}
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Reading prefs (local to this browser) -->
				<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-5 shadow-2xs">
					<h2 class="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
						Reading
					</h2>
					<p class="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
						Stored in this browser only.
					</p>

					<div class="mt-4 flex flex-col divide-y divide-[#f1f5f9]">
						<label class="flex items-center justify-between gap-4 py-2.5">
							<span class="text-[13px] font-medium text-slate-800">
								Mark messages read when opened
							</span>
							<input
								type="checkbox"
								class="size-4 accent-blue-600"
								checked={prefs.markReadOnOpen}
								onchange={(event) => setPref('markReadOnOpen', event.currentTarget.checked)}
							/>
						</label>

						<label class="flex items-center justify-between gap-4 py-2.5">
							<span class="text-[13px] font-medium text-slate-800">Show preview line in the list</span>
							<input
								type="checkbox"
								class="size-4 accent-blue-600"
								checked={prefs.showPreview}
								onchange={(event) => setPref('showPreview', event.currentTarget.checked)}
							/>
						</label>

						<label class="flex items-center justify-between gap-4 py-2.5">
							<span class="text-[13px] font-medium text-slate-800">Open folders on Unseen</span>
							<input
								type="checkbox"
								class="size-4 accent-blue-600"
								checked={prefs.unseenByDefault}
								onchange={(event) => setPref('unseenByDefault', event.currentTarget.checked)}
							/>
						</label>

						<label class="flex items-center justify-between gap-4 py-2.5">
							<span class="text-[13px] font-medium text-slate-800">Messages per folder</span>
							<select
								class="h-[30px] rounded-[6px] border border-[#cbd5e1] bg-white px-2 text-[13px] shadow-2xs focus:border-blue-500 focus:outline-none"
								value={prefs.pageSize}
								onchange={(event) => setPref('pageSize', Number(event.currentTarget.value))}
							>
								{#each PAGE_SIZES as size (size)}
									<option value={size}>{size}</option>
								{/each}
							</select>
						</label>

						<label class="flex items-center justify-between gap-4 py-2.5">
							<span class="text-[13px] font-medium text-slate-800">Message list width</span>
							<span class="flex items-center gap-2">
								<input
									type="range"
									min={LIST_MIN}
									max={LIST_MAX}
									step="10"
									class="w-40 accent-blue-600"
									value={prefs.listWidth}
									oninput={(event) => setPref('listWidth', Number(event.currentTarget.value))}
								/>
								<span class="w-12 text-right text-[12px] text-slate-500 tabular-nums">
									{prefs.listWidth}px
								</span>
							</span>
						</label>
					</div>

					<button
						type="button"
						class="btn-tactile mt-4"
						onclick={() => {
							for (const key of Object.keys(DEFAULT_PREFS) as (keyof typeof DEFAULT_PREFS)[]) {
								setPref(key, DEFAULT_PREFS[key] as never);
							}
						}}
					>
						Reset to defaults
					</button>
				</section>
			</div>
		</div>
	</div>
</div>
