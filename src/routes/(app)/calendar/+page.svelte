<script lang="ts">
	import { Calendar } from 'lucide-svelte';
	import CalendarSidebar from '$lib/components/calendar/CalendarSidebar.svelte';
	import EventPanel from '$lib/components/calendar/EventPanel.svelte';
	import EventPanelEmpty from '$lib/components/calendar/EventPanelEmpty.svelte';
	import MonthView from '$lib/components/calendar/MonthView.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { formatMonthTitle } from '$lib/utils/dates';

	const monthTitle = $derived(formatMonthTitle(calendar.viewYear, calendar.viewMonth));

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;

		calendar.viewYear;
		calendar.viewMonth;
		void calendar.loadMonth(client);
	});
</script>

<svelte:head>
	<title>{monthTitle} · Calendar · ZAUR</title>
</svelte:head>

{#if calendar.supported === false}
	<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 p-8">
		<div class="z-panel rounded-xl p-8 text-center">
			<Calendar class="mx-auto size-10 text-fg-subtle" aria-hidden="true" />
			<h1 class="mt-4 text-2xl font-semibold text-fg">Calendar unavailable</h1>
			<p class="mx-auto mt-2 max-w-md text-sm text-fg-muted">
				Your mail server does not advertise JMAP Calendars support yet. Calendar will appear here
				once it is enabled on your account.
			</p>
			<div class="mt-6">
				<Button href="/mail/inbox" variant="ghost">Back to mail</Button>
			</div>
		</div>
	</div>
{:else}
	<div class="hidden md:contents">
		<CalendarSidebar />
	</div>
	<MonthView />
	{#if calendar.selectedEvent}
		<EventPanel />
	{:else}
		<EventPanelEmpty />
	{/if}
{/if}
