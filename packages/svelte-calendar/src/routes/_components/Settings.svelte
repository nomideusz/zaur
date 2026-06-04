<script lang="ts">
	import { slide } from 'svelte/transition';
	import { onMount } from 'svelte';

	/* ─── Field definition types ─────────────────────── */
	type BaseField = {
		key: string;
		label: string;
		group?: string;
		enabledWhen?: string;
	};

	type RangeField = BaseField & {
		type: 'range';
		min: number;
		max: number;
		step: number;
	};

	type ToggleField = BaseField & {
		type: 'toggle';
	};

	type SelectField = BaseField & {
		type: 'select';
		options: { value: string; label: string }[];
	};

	type SegmentField = BaseField & {
		type: 'segment';
		options: { value: string; label: string }[];
	};

	export type SettingsField = RangeField | ToggleField | SelectField | SegmentField;

	/* ─── Props ───────────────────────────────────────── */
	interface Props {
		fields: SettingsField[];
		values: Record<string, string | number | boolean>;
	}

	let { fields, values = $bindable() }: Props = $props();

	const panelId = 'stg-panel';

	let open = $state(true);

	/* Collapse on mobile after mount (SSR-safe) */
	onMount(() => {
		if (window.innerWidth <= 600) open = false;
	});

	function setVal(key: string, v: string | number | boolean) {
		values = { ...values, [key]: v };
	}

	function fmt(v: string | number | boolean): string {
		if (typeof v === 'string') return v;
		if (typeof v === 'boolean') return v ? 'true' : 'false';
		if (Number.isInteger(v)) return String(v);
		return v.toFixed(2);
	}

	function controlId(key: string): string {
		return `stg-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
	}

	function isPrimaryField(field: SettingsField): field is SelectField | SegmentField {
		return field.type === 'select' || field.type === 'segment';
	}

	function isToggleField(field: SettingsField): field is ToggleField {
		return field.type === 'toggle';
	}

	function isNotToggleField(field: SettingsField): field is Exclude<SettingsField, ToggleField> {
		return field.type !== 'toggle';
	}

	/* Split fields into top-level (no group name) and grouped */
	const { topFields, groupedFields } = $derived.by(() => {
		const top: SettingsField[] = [];
		const orderedGroups: { name: string; id: string; fields: SettingsField[] }[] = [];
		const indexByName = new Map<string, number>();

		for (const field of fields) {
			const groupName = field.group ?? '';

			if (!groupName) {
				top.push(field);
				continue;
			}

			const existingIndex = indexByName.get(groupName);
			if (existingIndex === undefined) {
				const id = groupName
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/(^-|-$)/g, '');
				indexByName.set(groupName, orderedGroups.length);
				orderedGroups.push({ name: groupName, id: id || 'general', fields: [field] });
			} else {
				orderedGroups[existingIndex].fields.push(field);
			}
		}

		return { topFields: top, groupedFields: orderedGroups };
	});

	/* For mobile: split top-level fields into selects/segments vs toggles */
	const topSelects = $derived(topFields.filter(isPrimaryField));
	const topToggles = $derived(topFields.filter(isToggleField));
</script>

{#snippet segmentControl(f: SegmentField, fid: string, disabled: boolean, labelClass = 'stg-lbl')}
	{#if f.label}
		<span class={labelClass} id={`${fid}-label`}>{f.label}</span>
	{/if}
	<div
		class="stg-pills"
		role="radiogroup"
		aria-labelledby={f.label ? `${fid}-label` : undefined}
		aria-label={f.label ? undefined : f.key}
	>
		{#each f.options as option (option.value)}
			<button
				type="button"
				class="stg-pill"
				class:stg-pill--on={String(values[f.key]) === option.value}
				role="radio"
				aria-checked={String(values[f.key]) === option.value}
				{disabled}
				onclick={() => setVal(f.key, option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet selectControl(f: SelectField, fid: string, disabled: boolean, labelClass = 'stg-lbl')}
	{#if f.label}
		<label class={labelClass} for={fid}>{f.label}</label>
	{/if}
	<select
		id={fid}
		class="stg-sel"
		value={String(values[f.key] ?? '')}
		{disabled}
		onchange={(e) => setVal(f.key, (e.target as HTMLSelectElement).value)}
	>
		{#each f.options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
{/snippet}

{#snippet toggleControl(f: ToggleField, fid: string, disabled: boolean)}
	<label class="stg-row stg-row--toggle" class:stg-row--disabled={disabled} for={fid}>
		<span class="stg-lbl">{f.label}</span>
		<input
			id={fid}
			class="stg-sr"
			type="checkbox"
			role="switch"
			checked={values[f.key] === true}
			{disabled}
			onchange={(e) => setVal(f.key, (e.target as HTMLInputElement).checked)}
		/>
		<span class="stg-sw" aria-hidden="true">
			<span class="stg-sw-knob"></span>
		</span>
	</label>
{/snippet}

<div class="stg">
	<button
		class="stg-hd"
		aria-expanded={open}
		aria-controls={panelId}
		onclick={() => (open = !open)}
	>
		<svg
			class="stg-chevron"
			class:stg-chevron--open={open}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
		>
			<path d="M6 4l4 4-4 4" />
		</svg>
		<span class="stg-hd-copy">
			<span>Settings</span>
		</span>
	</button>

	{#if open}
		<div class="stg-body" id={panelId} transition:slide={{ duration: 180 }}>
			<!-- ─── Primary controls stay visible to keep the demo quick to scan. ─── -->
			{#if topSelects.length > 0}
				<div class="stg-bar">
					{#each topSelects as f (f.key)}
						{@const fid = controlId(f.key)}
						{@const disabled = !!f.enabledWhen && values[f.enabledWhen] !== true}
						{#if f.type === 'segment'}
							<div class="stg-bar-item" class:stg-row--disabled={disabled}>
								{@render segmentControl(f, fid, disabled, 'stg-col-title')}
							</div>
						{:else if f.type === 'select'}
							<div class="stg-bar-item" class:stg-row--disabled={disabled}>
								{@render selectControl(f, fid, disabled, 'stg-col-title')}
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if topToggles.length > 0}
				<div class="stg-toggles">
					{#each topToggles as f (f.key)}
						{@const fid = controlId(f.key)}
						{@const disabled = !!f.enabledWhen && values[f.enabledWhen] !== true}
						{@render toggleControl(f, fid, disabled)}
					{/each}
				</div>
			{/if}

			{#if groupedFields.length > 0}
				<details class="stg-advanced">
					<summary>Advanced controls</summary>
					<div class="stg-grid">
						{#each groupedFields as section (section.id)}
							<section class="stg-col" aria-labelledby={`stg-s-${section.id}`}>
								<h3 class="stg-col-title" id={`stg-s-${section.id}`}>{section.name}</h3>

								{#if section.fields.some(isToggleField)}
									<div class="stg-toggles stg-toggles--advanced">
										{#each section.fields.filter(isToggleField) as f (f.key)}
											{@const fid = controlId(f.key)}
											{@const disabled = !!f.enabledWhen && values[f.enabledWhen] !== true}
											{@render toggleControl(f, fid, disabled)}
										{/each}
									</div>
								{/if}

								{#each section.fields.filter(isNotToggleField) as f (f.key)}
									{@const fid = controlId(f.key)}
									{@const disabled = !!f.enabledWhen && values[f.enabledWhen] !== true}

									{#if f.type === 'range'}
										<div class="stg-row stg-row--rng" class:stg-row--disabled={disabled}>
											<div class="stg-rng-hd">
												<label class="stg-lbl" for={fid}>{f.label}</label>
												<span class="stg-num">{fmt(values[f.key])}</span>
											</div>
											<input
												id={fid}
												class="stg-rng"
												type="range"
												min={f.min}
												max={f.max}
												step={f.step}
												value={values[f.key]}
												{disabled}
												oninput={(e) => setVal(f.key, Number((e.target as HTMLInputElement).value))}
											/>
										</div>

									{:else if f.type === 'select'}
										<div class="stg-row" class:stg-row--disabled={disabled}>
											{@render selectControl(f, fid, disabled)}
										</div>

									{:else if f.type === 'segment'}
										<div class="stg-row stg-row--seg" class:stg-row--disabled={disabled}>
											{@render segmentControl(f, fid, disabled)}
										</div>
									{/if}
								{/each}
							</section>
						{/each}
					</div>
				</details>
			{/if}
		</div>
	{/if}
</div>

<style>
	.stg {
		--stg-border: var(--dt-border, rgba(148, 160, 180, 0.12));
		--stg-soft: color-mix(in srgb, var(--dt-text-3, rgba(148, 160, 180, 0.4)) 8%, transparent);
		--stg-strong: color-mix(in srgb, var(--dt-text-3, rgba(148, 160, 180, 0.4)) 14%, transparent);

		border: 1px solid var(--stg-border);
		border-radius: 10px;
		background: color-mix(in srgb, var(--dt-surface, #10141c) 88%, transparent);
		overflow: hidden;
		font-family: var(--dt-sans, 'Outfit', system-ui, sans-serif);
		margin-bottom: 14px;
	}

	.stg-hd {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 12px;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--dt-text-2, rgba(148, 160, 180, 0.78));
		text-align: left;
		transition: background 140ms, color 140ms;
	}
	.stg-hd:hover {
		background: var(--stg-soft);
		color: var(--dt-text, rgba(228, 234, 245, 0.9));
	}
	.stg-chevron {
		width: 12px;
		height: 12px;
		flex-shrink: 0;
		transition: transform 160ms ease;
	}
	.stg-chevron--open {
		transform: rotate(90deg);
	}
	.stg-hd-copy > span {
		font-weight: 700;
		font-size: 11px;
		line-height: 1;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.stg-body {
		padding: 0 12px 12px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 18px;
	}

	.stg-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
	}
	.stg-bar-item {
		display: grid;
		grid-template-columns: auto minmax(92px, auto);
		align-items: center;
		gap: 8px;
	}

	.stg-toggles {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 16px;
	}
	.stg-toggles--advanced {
		margin-bottom: 8px;
	}

	.stg-advanced {
		width: 100%;
		border-top: 1px solid color-mix(in srgb, var(--stg-border) 65%, transparent);
		padding-top: 9px;
	}
	.stg-advanced summary {
		width: fit-content;
		cursor: pointer;
		list-style: none;
		font-weight: 700;
		font-size: 10px;
		line-height: 1;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--dt-text-3, rgba(148, 160, 180, 0.56));
	}
	.stg-advanced summary::-webkit-details-marker {
		display: none;
	}
	.stg-advanced summary::after {
		content: ' +';
	}
	.stg-advanced[open] summary::after {
		content: ' -';
	}
	.stg-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 16px 24px;
		margin-top: 12px;
	}
	.stg-col {
		min-width: min(260px, 100%);
		flex: 1;
	}
	.stg-col-title {
		margin: 0 0 8px;
		font-weight: 700;
		font-size: 10px;
		line-height: 1;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--dt-text-3, rgba(148, 160, 180, 0.5));
	}

	.stg-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 34px;
		padding: 5px 0;
	}
	.stg-col > .stg-row + .stg-row {
		border-top: 1px solid color-mix(in srgb, var(--stg-border) 45%, transparent);
	}
	.stg-row--toggle {
		justify-content: flex-start;
		min-height: 24px;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		gap: 8px;
		transition: color 140ms;
	}
	.stg-row--toggle:hover {
		color: var(--dt-text, rgba(228, 234, 245, 0.9));
	}
	.stg-row--rng {
		flex-direction: column;
		align-items: stretch;
		justify-content: flex-start;
		gap: 7px;
		min-height: auto;
		padding: 8px 0;
	}
	.stg-row--seg {
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 7px;
		padding: 8px 0;
	}
	.stg-row--disabled {
		opacity: 0.42;
		pointer-events: none;
	}

	.stg-rng-hd {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	/* ─── Labels ──────────────────────────────────────── */
	.stg-lbl {
		font-weight: 700;
		font-size: 11px;
		line-height: 1.2;
		color: var(--dt-text-2, rgba(148, 160, 180, 0.72));
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ─── Toggle switch ──────────────────────────────── */
	.stg-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
	.stg-sw {
		position: relative;
		display: block;
		width: 30px;
		height: 16px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--stg-border) 82%, transparent);
		background: color-mix(in srgb, var(--dt-text-3, rgba(148, 160, 180, 0.4)) 15%, transparent);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 150ms, border-color 150ms;
	}
	.stg-sr:checked + .stg-sw {
		background: color-mix(in srgb, var(--dt-accent, #6366f1) 28%, transparent);
		border-color: color-mix(in srgb, var(--dt-accent, #6366f1) 55%, transparent);
	}
	.stg-sw-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--dt-text-3, rgba(148, 160, 180, 0.55));
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
		transition: transform 150ms ease, background 150ms;
	}
	.stg-sr:checked + .stg-sw .stg-sw-knob {
		transform: translateX(14px);
		background: var(--dt-btn-text, #fff);
	}

	/* ─── Range slider ───────────────────────────────── */
	.stg-rng {
		width: 100%;
		-webkit-appearance: none;
		appearance: none;
		height: 4px;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--dt-accent, #6366f1), color-mix(in srgb, var(--dt-text-3, rgba(148, 160, 180, 0.4)) 34%, transparent));
		outline: none;
		cursor: pointer;
	}
	.stg-rng::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--dt-text, rgba(228, 234, 245, 0.9));
		border: 2px solid color-mix(in srgb, var(--dt-bg, #0b0e14) 80%, transparent);
		cursor: grab;
		transition: transform 100ms, border-color 100ms;
	}
	.stg-rng::-webkit-slider-thumb:hover {
		transform: scale(1.12);
		border-color: var(--dt-accent, #6366f1);
	}
	.stg-rng::-webkit-slider-thumb:active {
		cursor: grabbing;
	}
	.stg-rng::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--dt-text, rgba(228, 234, 245, 0.9));
		border: 2px solid color-mix(in srgb, var(--dt-bg, #0b0e14) 80%, transparent);
		cursor: grab;
	}
	.stg-rng:disabled {
		cursor: default;
	}
	.stg-num {
		flex-shrink: 0;
		min-width: 28px;
		text-align: right;
		font: 700 11px / 1 var(--dt-mono, 'SF Mono', 'Cascadia Code', ui-monospace, monospace);
		font-variant-numeric: tabular-nums;
		color: var(--dt-accent, #6366f1);
	}

	/* ─── Select dropdown ────────────────────────────── */
	.stg-sel {
		appearance: none;
		width: auto;
		min-width: 84px;
		font-weight: 600;
		font-size: 12px;
		line-height: 1;
		padding: 7px 26px 7px 9px;
		border-radius: 7px;
		border: 1px solid color-mix(in srgb, var(--stg-border) 76%, transparent);
		background: var(--stg-soft);
		color: var(--dt-text, rgba(228, 234, 245, 0.9));
		outline: none;
		cursor: pointer;
		background-image: linear-gradient(45deg, transparent 50%, var(--dt-text-3, rgba(148, 160, 180, 0.5)) 50%),
			linear-gradient(135deg, var(--dt-text-3, rgba(148, 160, 180, 0.5)) 50%, transparent 50%);
		background-position: calc(100% - 14px) center, calc(100% - 9px) center;
		background-size: 5px 5px, 5px 5px;
		background-repeat: no-repeat;
		transition: border-color 120ms, background-color 120ms;
	}
	.stg-sel:hover {
		border-color: color-mix(in srgb, var(--dt-accent, #6366f1) 30%, var(--stg-border));
		background-color: var(--stg-strong);
	}
	.stg-sel:focus {
		border-color: color-mix(in srgb, var(--dt-accent, #6366f1) 55%, transparent);
	}
	.stg-sel option {
		background: var(--dt-bg, #0b0e14);
		color: var(--dt-text, rgba(228, 234, 245, 0.9));
	}

	/* ─── Segment pills ──────────────────────────────── */
	.stg-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.stg-pill {
		padding: 6px 10px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--stg-border) 68%, transparent);
		background: var(--stg-surface-soft);
		color: var(--dt-text-2, rgba(148, 160, 180, 0.72));
		font-weight: 600;
		font-size: 12px;
		line-height: 1;
		cursor: pointer;
		transition: border-color 120ms, color 120ms, background 120ms, transform 120ms;
	}
	.stg-pill:hover {
		color: var(--dt-text, rgba(228, 234, 245, 0.9));
		border-color: color-mix(in srgb, var(--dt-accent, #6366f1) 24%, var(--stg-border));
	}
	.stg-pill--on {
		color: var(--dt-btn-text, #fff);
		border-color: color-mix(in srgb, var(--dt-accent, #6366f1) 70%, transparent);
		background: color-mix(in srgb, var(--dt-accent, #6366f1) 78%, #000 0%);
		box-shadow: 0 6px 18px color-mix(in srgb, var(--dt-accent, #6366f1) 18%, transparent);
	}

	/* ─── Focus rings ────────────────────────────────── */
	.stg-sr:focus-visible + .stg-sw,
	.stg-sel:focus-visible,
	.stg-rng:focus-visible,
	.stg-pill:focus-visible,
	.stg-hd:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #6366f1) 55%, transparent);
		outline-offset: 2px;
	}

	/* ─── Responsive ─────────────────────────────────── */
	@media (max-width: 760px) {
		.stg {
			border-radius: 0;
			border-left: none;
			border-right: none;
		}
		.stg-hd {
			padding: 10px 16px;
		}
		.stg-body {
			padding: 0 16px 12px;
			gap: 10px 14px;
		}
		.stg-bar-item {
			grid-template-columns: 86px minmax(0, 1fr);
			width: 100%;
		}
		.stg-sel {
			width: 100%;
		}
		.stg-grid,
		.stg-col {
			width: 100%;
		}
	}
</style>
