<script lang="ts">
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
</script>

<!-- Calendar view tabs live in MobileTopBar; island keeps New event. -->
<div class="z-mobile-island__tabs z-mobile-island__tabs--compose" data-testid="island-calendar-action">
	{#if calendar.supported !== false}
		<button
			type="button"
			class="z-mobile-island__compose-pill"
			aria-label="New event"
			onclick={() => calendar.openCompose()}
		>
			<CalendarPlus class="size-[1.125rem]" aria-hidden="true" />
			<span>New event</span>
		</button>
	{/if}
</div>
