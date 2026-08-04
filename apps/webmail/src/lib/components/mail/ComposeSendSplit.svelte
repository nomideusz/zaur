<script lang="ts">
	/**
	 * Send | ▾ schedule control — used in the desktop compose header and the
	 * mobile top bar so phones get one Send surface without a floating dock.
	 */
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';

	interface SchedulePreset {
		label: string;
		date: Date;
	}

	interface Props {
		sendLabel: string;
		sendDisabled: boolean;
		sendBlockedReason?: string | null;
		scheduleDisabled: boolean;
		showSchedulePanel: boolean;
		onToggleSchedule: () => void;
		onCloseSchedule: () => void;
		schedulePresets: SchedulePreset[];
		onSchedule: (date: Date) => void;
		customSendTime: string;
		onCustomSendTimeChange: (value: string) => void;
		customSendTimeMin: string;
		formatScheduleTime: (date: Date) => string;
		/** Compact top-bar geometry on phones. */
		compact?: boolean;
	}

	let {
		sendLabel,
		sendDisabled,
		sendBlockedReason = null,
		scheduleDisabled,
		showSchedulePanel,
		onToggleSchedule,
		onCloseSchedule,
		schedulePresets,
		onSchedule,
		customSendTime,
		onCustomSendTimeChange,
		customSendTimeMin,
		formatScheduleTime,
		compact = false
	}: Props = $props();

	let zone = $state<HTMLDivElement | null>(null);

	function onWindowPointerDown(event: PointerEvent) {
		if (!showSchedulePanel) return;
		if (zone && event.target instanceof Node && !zone.contains(event.target)) {
			onCloseSchedule();
		}
	}
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

{#snippet sendButton(props: Record<string, unknown> = {})}
	<button
		{...props}
		type="submit"
		form="compose-form"
		class="z-mail-text-nav__action z-mail-text-nav__action--pill z-compose__send-main"
		disabled={sendDisabled}
		title={compact ? (sendBlockedReason ?? 'Send message') : undefined}
	>
		{sendLabel}
	</button>
{/snippet}

{#snippet scheduleButton(props: Record<string, unknown> = {})}
	<button
		{...props}
		type="button"
		class="z-mail-text-nav__action z-mail-text-nav__action--pill z-compose__send-caret"
		aria-label="Schedule send"
		aria-haspopup="menu"
		aria-expanded={showSchedulePanel}
		disabled={scheduleDisabled}
		title={compact ? 'Schedule send' : undefined}
		onclick={onToggleSchedule}
	>
		<ChevronDown class="size-4" aria-hidden="true" />
	</button>
{/snippet}

<div
	class="z-compose__send-split relative"
	class:z-compose__send-split--compact={compact}
	bind:this={zone}
>
	{#if compact}
		<!-- No TooltipWrap: Ark wraps break the joined Send|▾ pill in the top bar. -->
		{@render sendButton()}
		{@render scheduleButton()}
	{:else}
		<TooltipWrap label={sendBlockedReason ?? 'Send message'} wrapDisabled={sendDisabled}>
			{#snippet trigger({ props })}
				{@render sendButton(props)}
			{/snippet}
		</TooltipWrap>
		<TooltipWrap label="Schedule send" wrapDisabled={scheduleDisabled}>
			{#snippet trigger({ props })}
				{@render scheduleButton(props)}
			{/snippet}
		</TooltipWrap>
	{/if}
	{#if showSchedulePanel}
		<div
			class="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-border bg-surface-raised p-2 shadow-lg"
			role="menu"
			aria-label="Schedule send"
		>
			{#each schedulePresets as preset (preset.label)}
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-fg hover:bg-surface-sunken"
					onclick={() => onSchedule(preset.date)}
				>
					<span>{preset.label}</span>
					<span class="text-xs tabular-nums text-fg-subtle">
						{formatScheduleTime(preset.date)}
					</span>
				</button>
			{/each}
			<div class="my-2 border-t border-border"></div>
			<div class="flex flex-col gap-2 px-1 pb-1">
				<label class="text-xs text-fg-muted" for="compose-schedule-custom">
					Pick date &amp; time
				</label>
				<input
					id="compose-schedule-custom"
					type="datetime-local"
					class="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg outline-none focus-visible:border-accent"
					min={customSendTimeMin}
					value={customSendTime}
					oninput={(event) =>
						onCustomSendTimeChange((event.currentTarget as HTMLInputElement).value)}
				/>
				<button
					type="button"
					class="z-mail-text-nav__action z-mail-text-nav__action--pill"
					disabled={!customSendTime}
					onclick={() => customSendTime && onSchedule(new Date(customSendTime))}
				>
					Schedule
				</button>
			</div>
		</div>
	{/if}
</div>
