<script lang="ts">
	import { onMount } from "svelte";
	import {
		Calendar,
		createMemoryAdapter,
		createRecurringAdapter,
		createCompositeAdapter,
		generatePalette,
		auto,
		neutral,
		presets,
		initTextMeasure,
	} from "$lib/index.js";
	import type { PresetName } from "$lib/index.js";
	import Settings from "./_components/Settings.svelte";
	import type { SettingsField } from "./_components/Settings.svelte";
	import type { CalendarView, TimelineEvent } from "$lib/index.js";
	import { themeStore, demoThemes } from "./theme.svelte.js";
	import { createDemoEvents, createDemoRecurring } from "./demo-events.js";

	type SettingValue = string | number | boolean;

	let isMobile = $state(false);
	let pretextActive = $state(false);
	let pretextLoading = $state(false);

	onMount(() => {
		const mql = window.matchMedia("(max-width: 768px)");
		isMobile = mql.matches;
		function onChange(e: MediaQueryListEvent) {
			isMobile = e.matches;
		}
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	});

	async function togglePretext() {
		if (pretextActive) {
			// Can't unload a module — reload to disable
			(globalThis as any).__pretextModule = null;
			pretextActive = false;
			return;
		}
		pretextLoading = true;
		const ok = await initTextMeasure();
		pretextActive = ok;
		pretextLoading = false;
	}

	function createVisibleHours(
		enabled: boolean,
		startValue: SettingValue | undefined,
		endValue: SettingValue | undefined,
	): [number, number] | undefined {
		if (!enabled) return undefined;

		const startHour = Number(startValue ?? 6);
		const endHour = Math.max(startHour + 1, Number(endValue ?? 21));

		return [startHour, endHour];
	}

	function toMobileMode(value: SettingValue | undefined): "auto" | boolean {
		if (value === "force") return true;
		if (value === "desktop") return false;

		return "auto";
	}

	const calendarHeight = $derived(isMobile ? 500 : 700);
	const calendarRadius = $derived(isMobile ? 0 : 12);

	let settingsValues = $state<Record<string, SettingValue>>({
		readOnly: false,
		mondayStart: true,
		showModePills: true,
		showNavigation: true,
		equalDays: false,
		activeView: "week-planner",
		locale: "en-US",
		showDates: true,
		calendarPreset: "auto",
		mobileMode: "auto",
		days: 7,
		visibleHoursEnabled: false,
		startHour: 6,
		endHour: 21,
		blockedSlotsEnabled: true,
		disabledDatesEnabled: true,
		compact: false,
	});

	const readOnly = $derived(Boolean(settingsValues.readOnly));
	const mondayStart = $derived(Boolean(settingsValues.mondayStart));
	const showModePills = $derived(
		Boolean(settingsValues.showModePills ?? true),
	);
	const showNavigation = $derived(
		Boolean(settingsValues.showNavigation ?? true),
	);
	const equalDays = $derived(Boolean(settingsValues.equalDays));
	const showDates = $derived(Boolean(settingsValues.showDates ?? true));
	const visibleHoursEnabled = $derived(Boolean(settingsValues.visibleHoursEnabled));
	const visibleHours = $derived<[number, number] | undefined>(
		createVisibleHours(
			visibleHoursEnabled,
			settingsValues.startHour,
			settingsValues.endHour,
		),
	);
	const mobileMode = $derived<"auto" | boolean>(toMobileMode(settingsValues.mobileMode));
	const days = $derived(Math.max(1, Math.min(14, Number(settingsValues.days ?? 7))));
	const compact = $derived(Boolean(settingsValues.compact));
	const blockedSlotsEnabled = $derived(Boolean(settingsValues.blockedSlotsEnabled));
	const disabledDatesEnabled = $derived(Boolean(settingsValues.disabledDatesEnabled));
	const activeView = $derived(
		(settingsValues.activeView as CalendarView["id"]) ?? "week-planner",
	);
	const locale = $derived((settingsValues.locale as string) ?? "en-US");
	const dir = $derived<"ltr" | "rtl">(settingsValues.rtl ? "rtl" : "ltr");

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const settingsFields: SettingsField[] = [
		{
			key: "activeView",
			label: "View",
			group: "",
			type: "select",
			options: [
				{ value: "week-planner", label: "Week Planner" },
				{ value: "day-planner", label: "Day Planner" },
				{ value: "week-agenda", label: "Week Agenda" },
				{ value: "day-agenda", label: "Day Agenda" },
			],
		},
		{
			key: "calendarPreset",
			label: "Theme",
			group: "",
			type: "select",
			options: [
				{ value: "auto", label: "Auto (adapt to page)" },
				{ value: "neutral", label: "Neutral (light)" },
				{ value: "midnight", label: "Midnight (dark)" },
			],
		},
		{
			key: "locale",
			label: "Locale",
			group: "",
			type: "select",
			options: [
				{ value: "en-US", label: "en-US" },
				{ value: "pl-PL", label: "pl-PL" },
				{ value: "de-DE", label: "de-DE" },
				{ value: "fr-FR", label: "fr-FR" },
				{ value: "ar-SA", label: "ar-SA" },
			],
		},
		{
			key: "mobileMode",
			label: "Mobile",
			group: "",
			type: "select",
			options: [
				{ value: "auto", label: "Auto" },
				{ value: "force", label: "Force mobile" },
				{ value: "desktop", label: "Force desktop" },
			],
		},

		{
			key: "mondayStart",
			label: "Monday Start",
			group: "",
			type: "toggle",
		},
		{ key: "readOnly", label: "Read Only", group: "", type: "toggle" },
		{
			key: "showModePills",
			label: "Mode Pills",
			group: "",
			type: "toggle",
		},
		{
			key: "showNavigation",
			label: "Navigation",
			group: "",
			type: "toggle",
		},
		{ key: "equalDays", label: "Equal Days", group: "", type: "toggle" },
		{ key: "showDates", label: "Show Dates", group: "", type: "toggle" },
		{ key: "rtl", label: "RTL", group: "", type: "toggle" },
		{ key: "compact", label: "Compact Agenda", group: "", type: "toggle" },
		{
			key: "blockedSlotsEnabled",
			label: "Blocked Slots",
			group: "Availability",
			type: "toggle",
		},
		{
			key: "disabledDatesEnabled",
			label: "Disabled Dates",
			group: "Availability",
			type: "toggle",
		},
		{
			key: "visibleHoursEnabled",
			label: "Visible Hours",
			group: "Planner",
			type: "toggle",
		},
		{
			key: "startHour",
			label: "Start Hour",
			group: "Planner",
			type: "range",
			min: 0,
			max: 22,
			step: 1,
			enabledWhen: "visibleHoursEnabled",
		},
		{
			key: "endHour",
			label: "End Hour",
			group: "Planner",
			type: "range",
			min: 1,
			max: 24,
			step: 1,
			enabledWhen: "visibleHoursEnabled",
		},
		{
			key: "days",
			label: "Week Days",
			group: "Planner",
			type: "range",
			min: 1,
			max: 14,
			step: 1,
		},
	];

	// ── Seed data (auto-generated relative to today) ──────
	const seed: TimelineEvent[] = createDemoEvents(today);
	const recurring = createDemoRecurring();

	// ── Adapter (palette adapts to demo theme accent) ─────────
	// Composite: one-off events (memory) + recurring schedule
	const accent = $derived(demoThemes[themeStore.current].accent);
	const palette = $derived(generatePalette(accent));
	const adapter = $derived(
		createCompositeAdapter([
			createMemoryAdapter(seed, { palette }),
			createRecurringAdapter(recurring, { palette }),
		]),
	);

	// ── Calendar preset theme (from Settings panel) ───────
	const selectedPreset = $derived(
		(settingsValues.calendarPreset as string) ?? "auto",
	);
	const calendarTheme = $derived(
		presets[selectedPreset as PresetName] ?? auto,
	);
	// Enable smart auto-probe only when the "auto" preset is selected.
	// For explicit presets (neutral, midnight), disable auto-probing.
	const autoThemeProp = $derived(selectedPreset === "auto" ? {} : false);

	// ── Callbacks ──────────────────────────────────────────
	let lastAction = $state("");
	function handleClick(ev: TimelineEvent) {
		lastAction = `Clicked: ${ev.title}`;
	}
	function handleCreate(range: { start: Date; end: Date }) {
		lastAction = `Create: ${range.start.toLocaleTimeString()} – ${range.end.toLocaleTimeString()}`;
	}
	function handleMove(event: TimelineEvent, start: Date, end: Date) {
		lastAction = `Moved: ${event.title} → ${start.toLocaleTimeString()} – ${end.toLocaleTimeString()}`;
	}
	function handleViewChange(viewId: CalendarView["id"]) {
		if (activeView !== viewId) {
			settingsValues = { ...settingsValues, activeView: viewId };
		}
	}

	const blockedSlots = $derived(
		blockedSlotsEnabled
			? [
					{ start: 12, end: 13, label: "Lunch" },
					{ day: 6, start: 0, end: 9, label: "Sat morning" },
					{ day: 7, start: 0, end: 9, label: "Sun morning" },
				]
			: undefined,
	);
	const disabledDates = $derived(
		disabledDatesEnabled
			? [
					new Date(today.getTime() + 2 * 86_400_000),
					new Date(today.getTime() + 4 * 86_400_000),
				]
			: undefined,
	);
</script>

<svelte:head>
	<title>svelte-calendar – Demo</title>
</svelte:head>

<main>
	<Settings fields={settingsFields} bind:values={settingsValues} />

	<div class="toolbar">
		<div class="action-area">
			{#if lastAction}
				<div class="action">
					<span class="dot"></span>
					{lastAction}
				</div>
			{/if}
		</div>
		<button
			class="pretext-toggle"
			class:pretext-on={pretextActive}
			onclick={togglePretext}
			disabled={pretextLoading}
			aria-describedby="pretext-help"
		>
			{#if pretextLoading}
				Loading text fitting…
			{:else if pretextActive}
				Text fitting: precise
			{:else}
				Text fitting: basic
			{/if}
		</button>
		<p class="pretext-help" id="pretext-help">
			Pretext is optional. Turn it on to load the text-measurement engine and fit event labels more accurately.
		</p>
	</div>

	<Calendar
		{adapter}
		view={activeView}
		theme={calendarTheme}
		autoTheme={autoThemeProp}
		height={calendarHeight}
		borderRadius={calendarRadius}
		{readOnly}
		{mondayStart}
		{showModePills}
		{showNavigation}
		{equalDays}
		{showDates}
		{visibleHours}
		mobile={mobileMode}
		{days}
		{compact}
		{locale}
		{dir}
		blockedSlots={blockedSlots}
		disabledDates={disabledDates}
		onviewchange={handleViewChange}
		oneventclick={handleClick}
		oneventcreate={handleCreate}
		oneventmove={handleMove}
	/>
</main>

<style>
	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 32px 24px 64px;
		background: var(--dt-stage-bg, #080a0f);
		transition:
			background 300ms ease,
			color 300ms ease;
	}

	@media (max-width: 600px) {
		main {
			padding: 16px 0 32px;
		}
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 10px;
		gap: 12px;
		margin: -4px 0 16px;
	}
	.action-area {
		flex: 1;
		min-width: 0;
		padding-top: 5px;
	}
	.action {
		font: 400 11px/1.2 var(--dt-sans, "Outfit", system-ui, sans-serif);
		color: var(--dt-text-2, rgba(226, 232, 240, 0.6));
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 0 10px;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--dt-success, #34d399);
		flex-shrink: 0;
	}
	.pretext-toggle {
		border: 1px solid rgba(148, 163, 184, 0.15);
		background: rgba(148, 163, 184, 0.06);
		color: rgba(148, 163, 184, 0.55);
		font: 600 10px/1 var(--dt-sans, "Outfit", system-ui, sans-serif);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 5px 10px;
		border-radius: 6px;
		cursor: pointer;
		white-space: nowrap;
		transition: all 150ms;
		flex-shrink: 0;
	}
	.pretext-help {
		max-width: 360px;
		margin: 0;
		font: 400 11px/1.4 var(--dt-sans, "Outfit", system-ui, sans-serif);
		color: var(--dt-text-3, rgba(148, 163, 184, 0.52));
		text-align: right;
	}
	.pretext-toggle:hover {
		color: rgba(226, 232, 240, 0.85);
		border-color: rgba(148, 163, 184, 0.3);
	}
	.pretext-on {
		background: rgba(52, 211, 153, 0.12);
		border-color: rgba(52, 211, 153, 0.3);
		color: #34d399;
	}
	.pretext-on:hover {
		background: rgba(52, 211, 153, 0.2);
		color: #34d399;
	}
	@media (max-width: 760px) {
		.toolbar {
			flex-direction: column;
			align-items: stretch;
			padding: 0 16px;
		}
		.pretext-toggle {
			width: fit-content;
		}
		.pretext-help {
			text-align: left;
			max-width: none;
		}
	}
</style>
