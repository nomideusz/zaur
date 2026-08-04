<script lang="ts">
	/**
	 * STDF evaluation spike (dev-only, /stdf-lab).
	 *
	 * Question this page answers: can STDF components live inside our chrome
	 * without dragging their own look across the app? Its theme plugin emits
	 * every variable under [data-theme="…"] (never :root), so the wrapper
	 * below is the whole isolation mechanism — remove the attribute and the
	 * components fall back to STDF defaults.
	 *
	 * Judge three things here: whether the widgets feel native on a phone,
	 * whether they can be made to look like ours, and what they cost in CSS.
	 */
	// No subpath exports — the package root is the only entry. Tree-shaking
	// still applies (sideEffects is CSS-only).
	import { NumKeyboard, Picker } from 'stdf';

	let pin = $state('');
	let keyboardOpen = $state(false);

	let pickerOpen = $state(false);
	let picked = $state('—');

	const hours = Array.from({ length: 24 }, (_, h) => ({
		label: `${String(h).padStart(2, '0')}:00`
	}));
</script>

<svelte:head><title>stdf-lab</title></svelte:head>

<div class="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-surface p-4 text-fg">
	<header class="flex flex-col gap-1">
		<h1 class="text-lg font-semibold">STDF spike</h1>
		<p class="text-sm text-fg-muted">
			Dev-only. Components render inside a <code>data-theme</code> scope, so nothing here can
			restyle the rest of webmail.
		</p>
	</header>

	<section class="flex flex-col gap-3">
		<h2 class="text-sm font-semibold">Numeric keyboard</h2>
		<p class="text-sm text-fg-muted">
			The gap it would fill: passcode / TOTP entry without the OS keyboard covering half the
			screen.
		</p>
		<div class="flex items-center gap-3">
			<output class="z-action-bar-value min-w-24 tabular-nums">{pin || '—'}</output>
			<button type="button" class="z-action-bar-btn" onclick={() => (keyboardOpen = true)}>
				Open keyboard
			</button>
			<button type="button" class="z-action-bar-btn" onclick={() => (pin = '')}>Clear</button>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="text-sm font-semibold">Wheel picker</h2>
		<p class="text-sm text-fg-muted">
			The gap it would fill: time selection in calendar compose, where we currently fall back to
			desktop-shaped inputs.
		</p>
		<div class="flex items-center gap-3">
			<output class="z-action-bar-value min-w-24 tabular-nums">{picked}</output>
			<button type="button" class="z-action-bar-btn" onclick={() => (pickerOpen = true)}>
				Pick a time
			</button>
		</div>
	</section>

	<!-- Everything STDF renders is confined to this subtree. -->
	<div data-theme="STDF">
		<NumKeyboard bind:visible={keyboardOpen} bind:value={pin} close done dot={false} />
		<Picker
			bind:visible={pickerOpen}
			datas={[{ data: hours, showRow: 5 }]}
			title="Start time"
			onconfirm={(items: { label?: string }[]) => {
				picked = items?.[0]?.label ?? picked;
			}}
		/>
	</div>
</div>
