<script lang="ts">
	import { errorMessage } from '@zaur/mail-core/utils/errors';
	import CalendarEditorDialog from '$lib/components/calendar/CalendarEditorDialog.svelte';
	import ShareCalendarDialog from '$lib/components/calendar/ShareCalendarDialog.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import {
		calendarAllowsShare,
		calendarKey,
		isOwnedCalendar,
		nextCalendarColor
	} from '$lib/jmap/calendar-rights';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Calendar } from '$lib/types/calendar';
	import { haptic } from '$lib/utils/haptics';
	import { isCoarsePointer } from '$lib/utils/pointer-env';
	import { cn } from '$lib/utils/cn';
	import X from '$lib/components/icons/X.svelte';

	interface Props {
		class?: string;
		variant?: 'sidebar' | 'drawer';
		embedded?: boolean;
		onClose?: () => void;
	}

	let {
		class: className = '',
		variant = 'sidebar',
		embedded = false,
		onClose
	}: Props = $props();

	const SKELETON_WIDTHS = ['55%', '72%', '48%', '64%'];

	let editorOpen = $state(false);
	let editorMode = $state<'create' | 'edit'>('create');
	let editorCalendarId = $state<string | null>(null);
	let editorSubmitting = $state(false);
	let shareOpen = $state(false);
	let shareCalendarId = $state<string | null>(null);

	const ownedCalendars = $derived(calendar.calendars.filter(isOwnedCalendar));
	const sharedCalendars = $derived(calendar.calendars.filter((item) => !isOwnedCalendar(item)));
	const editorTarget = $derived(
		editorCalendarId ? calendar.calendarById(editorCalendarId) : undefined
	);

	function openCreate() {
		editorMode = 'create';
		editorCalendarId = null;
		editorOpen = true;
	}

	function openEdit(item: Calendar) {
		editorMode = 'edit';
		editorCalendarId = calendarKey(item);
		editorOpen = true;
	}

	function openShare(item: Calendar) {
		shareCalendarId = calendarKey(item);
		shareOpen = true;
	}

	async function submitEditor(value: { name: string; color: string }) {
		const client = auth.client;
		if (!client) {
			toast.show('Connect to manage calendars', 'error');
			return;
		}

		editorSubmitting = true;
		try {
			if (editorMode === 'edit' && editorCalendarId) {
				await calendar.updateCalendarDetails(client, editorCalendarId, value);
			} else {
				await calendar.createCalendar(client, value);
			}
			editorOpen = false;
		} catch (error) {
			toast.show(errorMessage(error, 'Could not save calendar'), 'error');
		} finally {
			editorSubmitting = false;
		}
	}

	async function setDefault(item: Calendar) {
		const client = auth.client;
		if (!client) {
			toast.show('Connect to manage calendars', 'error');
			return;
		}
		try {
			await calendar.setDefaultCalendar(client, calendarKey(item));
		} catch (error) {
			toast.show(errorMessage(error, 'Could not set default calendar'), 'error');
		}
	}

	async function deleteCalendar(item: Calendar) {
		const client = auth.client;
		if (!client) {
			toast.show('Connect to manage calendars', 'error');
			return;
		}
		try {
			await calendar.deleteCalendar(client, calendarKey(item));
		} catch (error) {
			toast.show(errorMessage(error, 'Could not delete calendar'), 'error');
		}
	}

	function toggle(item: Calendar) {
		if (isCoarsePointer()) haptic(8);
		calendar.toggleCalendar(item, auth.client);
	}
</script>

{#snippet calendarRow(item: Calendar)}
	{@const shareCount = item.shareWith ? Object.keys(item.shareWith).length : 0}
	<li class="flex items-center gap-0.5">
		<Checkbox
			checked={calendar.isCalendarVisible(item)}
			label={`Show ${item.name} calendar`}
			onchange={() => toggle(item)}
			class={cn(
				'z-checkbox-row min-w-0 flex-1 py-2 text-left',
				calendar.isCalendarVisible(item) ? 'text-fg' : 'text-fg-muted'
			)}
		>
			<span
				class="size-2.5 shrink-0 rounded-full"
				style:background-color={item.color}
				aria-hidden="true"
			></span>
			<span class="min-w-0 flex-1 truncate">{item.name}</span>
			{#if item.isDefault}
				<span class="shrink-0 text-[0.65rem] font-medium uppercase tracking-wide text-fg-subtle">
					Default
				</span>
			{:else if shareCount > 0}
				<span class="shrink-0 text-[0.65rem] text-fg-subtle">Shared</span>
			{/if}
		</Checkbox>
		<OverflowMenu
			label="Actions for {item.name}"
			menuClass="w-48 min-w-48"
			triggerClass="z-btn-icon size-8 p-1.5 text-fg-muted"
		>
			<OverflowMenuItem label="Edit calendar" onclick={() => openEdit(item)} />
			{#if calendarAllowsShare(item) && auth.client?.hasPrincipals()}
				<OverflowMenuItem
					label={shareCount ? `Sharing (${shareCount})` : 'Share calendar'}
					onclick={() => openShare(item)}
				/>
			{/if}
			{#if !item.isDefault}
				<OverflowMenuItem label="Set as default" onclick={() => void setDefault(item)} />
			{/if}
			<OverflowMenuItem
				label="Delete calendar"
				danger
				onclick={() => void deleteCalendar(item)}
			/>
		</OverflowMenu>
	</li>
{/snippet}

{#snippet calendarGroup(title: string, items: Calendar[])}
	{#if items.length}
		<div class="flex flex-col gap-0.5">
			<h3 class="z-type-label px-3 pb-1 pt-2">{title}</h3>
			<ul class="flex flex-col gap-0.5">
				{#each items as item (calendarKey(item))}
					{@render calendarRow(item)}
				{/each}
			</ul>
		</div>
	{/if}
{/snippet}

<aside
	class={cn(
		variant === 'sidebar' &&
			'z-mail-pane-surface min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r border-border',
		variant === 'drawer' && 'min-h-0 flex-col overflow-hidden',
		className
	)}
	style={variant === 'sidebar' ? 'view-transition-name: calendar-sidebar;' : undefined}
	aria-label="Calendars"
>
	<div class="shrink-0 border-b border-border/80 px-4 py-3">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<h2 class="z-type-label">Calendars</h2>
				{#if calendar.calendars.length}
					<p class="mt-1 text-xs text-fg-muted">
						{calendar.calendars.length} calendar{calendar.calendars.length === 1 ? '' : 's'}
					</p>
				{/if}
			</div>
			{#if onClose && !embedded}
				<button
					type="button"
					class="z-btn-icon -mr-1 shrink-0"
					aria-label="Close calendars"
					onclick={onClose}
				>
					<X class="size-5" aria-hidden="true" />
				</button>
			{/if}
		</div>
	</div>

	<ScrollArea class="min-h-0 flex-1">
		<nav class="p-2.5">
		{#if calendar.calendarsLoading}
			<ul class="flex flex-col gap-0.5" aria-hidden="true">
				{#each SKELETON_WIDTHS as width, i (i)}
					<li class="flex items-center gap-2.5 px-3 py-2">
						<span class="z-skeleton size-4 shrink-0 rounded"></span>
						<span class="z-skeleton size-2.5 shrink-0 rounded-full"></span>
						<span class="z-skeleton h-3 rounded" style="width: {width};"></span>
					</li>
				{/each}
			</ul>
			<p class="sr-only" role="status">Loading calendars…</p>
		{:else if calendar.supported === false}
			<p class="px-3 py-4 text-sm text-fg-muted">Calendars are not available on this account.</p>
		{:else if !calendar.calendars.length}
			<p class="px-3 py-4 text-sm text-fg-muted">No calendars found.</p>
		{:else if sharedCalendars.length}
			{@render calendarGroup('My calendars', ownedCalendars)}
			{@render calendarGroup('Shared with me', sharedCalendars)}
		{:else}
			<ul class="flex flex-col gap-0.5">
				{#each ownedCalendars as item (calendarKey(item))}
					{@render calendarRow(item)}
				{/each}
			</ul>
		{/if}
		</nav>
	</ScrollArea>

	{#if calendar.supported !== false && auth.client}
		<div class="shrink-0 border-t border-border/80 px-3 py-2">
			<button
				type="button"
				class="z-mail-text-nav__link w-full px-1 py-1.5 text-left text-xs"
				onclick={openCreate}
			>
				New calendar
			</button>
		</div>
	{/if}
</aside>

<CalendarEditorDialog
	bind:open={editorOpen}
	mode={editorMode}
	name={editorTarget?.name ?? ''}
	color={editorTarget?.color ?? nextCalendarColor(calendar.calendars.map((item) => item.color))}
	submitting={editorSubmitting}
	onSubmit={submitEditor}
/>

<ShareCalendarDialog bind:open={shareOpen} calendarId={shareCalendarId} />
