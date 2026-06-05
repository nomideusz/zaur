<script lang="ts">
	import ZaurCalendarIcon from '$lib/components/icons/Calendar.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import { Calendar as LibCalendar, auto } from '@nomideusz/svelte-calendar';
	import CalendarSidebar from '$lib/components/calendar/CalendarSidebar.svelte';
	import EventComposePanel from '$lib/components/calendar/EventComposePanel.svelte';
	import EventPanel from '$lib/components/calendar/EventPanel.svelte';
	import EventPanelEmpty from '$lib/components/calendar/EventPanelEmpty.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { ZaurCalendarAdapter } from '$lib/components/calendar/calendar-adapter';
	import { cn } from '$lib/utils/cn';

	let activeView = $state<'week-planner' | 'day-planner' | 'week-agenda' | 'day-agenda'>('week-planner');
	let currentDate = $state<Date>(new Date());

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;

		// Keep store's viewMonth/viewYear aligned so loadMonth works if triggered by other parts of the app
		if (calendar.viewYear !== currentDate.getFullYear() || calendar.viewMonth !== currentDate.getMonth()) {
			calendar.viewYear = currentDate.getFullYear();
			calendar.viewMonth = currentDate.getMonth();
		}
	});

	// Derive svelte-calendar adapter reactively when visibility filter, refreshCounter, or client changes
	const calAdapter = $derived.by(() => {
		const client = auth.client;
		if (!client) return null;

		// Access reactively so the adapter is re-instantiated and svelte-calendar reloads when filters change
		calendar.hiddenCalendarIds;
		calendar.refreshCounter;

		return new ZaurCalendarAdapter(client);
	});

	const headerTitle = $derived.by(() => {
		if (activeView.startsWith('day')) {
			return currentDate.toLocaleDateString(undefined, {
				weekday: 'long',
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} else {
			return currentDate.toLocaleDateString(undefined, {
				month: 'long',
				year: 'numeric'
			});
		}
	});

	function prev() {
		const days = activeView.startsWith('day') ? 1 : 7;
		currentDate = new Date(currentDate.getTime() - days * 24 * 60 * 60 * 1000);
	}

	function next() {
		const days = activeView.startsWith('day') ? 1 : 7;
		currentDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);
	}

	function goToday() {
		currentDate = new Date();
	}

	function handleDateChange(date: Date) {
		if (currentDate.getTime() !== date.getTime()) {
			currentDate = date;
		}
	}

	function handleViewChange(viewId: string) {
		const validViews = ['week-planner', 'day-planner', 'week-agenda', 'day-agenda'];
		if (validViews.includes(viewId) && activeView !== viewId) {
			activeView = viewId as typeof activeView;
		}
	}
</script>

<svelte:head>
	<title>{headerTitle} · Calendar · ZAUR</title>
</svelte:head>

{#if calendar.supported === false}
	<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 p-8">
		<div class="z-panel rounded-xl p-8 text-center">
			<ZaurCalendarIcon class="mx-auto size-10 text-fg-subtle" aria-hidden="true" />
			<h1 class="mt-4 text-2xl font-semibold text-fg">Calendar unavailable</h1>
			<p class="mx-auto mt-2 max-w-md text-sm text-fg-muted">
				Your mail server does not advertise JMAP Calendars support yet. Calendar will appear here
				once it is enabled on your account.
			</p>
			<div class="mt-6">
				<Button href={settings.preferredMailHref()} variant="ghost">Back to mail</Button>
			</div>
		</div>
	</div>
{:else}
	<div class="hidden md:contents">
		<CalendarSidebar />
	</div>
	<section
		class={cn(
			'z-mail-pane-surface flex min-h-0 min-w-0 flex-col overflow-hidden',
			calendar.selectedEvent ? 'hidden md:flex md:flex-1' : 'flex flex-1',
			'md:border-r md:border-border'
		)}
		style="view-transition-name: calendar-grid;"
		aria-label="Calendar view"
	>
		<div class="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/80 px-4 py-2">
			<div class="flex items-center gap-1">
				<IconButton label="Previous" onclick={prev}>
					<ChevronLeft class="size-4" />
				</IconButton>
				<h2 class="min-w-36 text-center text-sm font-semibold text-fg">
					{headerTitle}
				</h2>
				<IconButton label="Next" onclick={next}>
					<ChevronRight class="size-4" />
				</IconButton>
			</div>

			<div class="flex items-center gap-3">
				<Button variant="ghost" onclick={goToday}>Today</Button>

				<div class="h-4 w-px bg-border/80" aria-hidden="true"></div>

				<!-- View Selector Segment Control -->
				<div class="flex items-center rounded-lg bg-surface-sunken/60 p-0.5 border border-border/50">
					<button
						type="button"
						class={cn(
							'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
							activeView === 'week-planner'
								? 'bg-surface-raised text-fg shadow-sm font-semibold'
								: 'text-fg-muted hover:text-fg'
						)}
						onclick={() => activeView = 'week-planner'}
					>
						Week
					</button>
					<button
						type="button"
						class={cn(
							'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
							activeView === 'day-planner'
								? 'bg-surface-raised text-fg shadow-sm font-semibold'
								: 'text-fg-muted hover:text-fg'
						)}
						onclick={() => activeView = 'day-planner'}
					>
						Day
					</button>
					<button
						type="button"
						class={cn(
							'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
							activeView === 'week-agenda'
								? 'bg-surface-raised text-fg shadow-sm font-semibold'
								: 'text-fg-muted hover:text-fg'
						)}
						onclick={() => activeView = 'week-agenda'}
					>
						Week Agenda
					</button>
					<button
						type="button"
						class={cn(
							'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
							activeView === 'day-agenda'
								? 'bg-surface-raised text-fg shadow-sm font-semibold'
								: 'text-fg-muted hover:text-fg'
						)}
						onclick={() => activeView = 'day-agenda'}
					>
						Day Agenda
					</button>
				</div>
			</div>
		</div>

		{#if calAdapter}
			<LibCalendar
				adapter={calAdapter}
				view={activeView}
				currentDate={currentDate}
				theme={auto}
				showModePills={false}
				showNavigation={false}
				oneventclick={(evt) => calendar.selectEvent(evt.id)}
				oneventcreate={(range) => calendar.openCompose(range.start)}
				ondatechange={handleDateChange}
				onviewchange={handleViewChange}
			/>
		{/if}
	</section>
	{#if calendar.selectedEvent}
		<EventPanel />
	{:else}
		<EventPanelEmpty />
	{/if}
{/if}

{#if calendar.composeOpen}
	<EventComposePanel />
{/if}

<style>
	:global(.cal) {
		height: 100% !important;
		border: none !important;
		border-radius: 0 !important;
	}
</style>
