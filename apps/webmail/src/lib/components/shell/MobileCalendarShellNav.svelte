<script lang="ts">
	import { calendar, type CalendarViewTab } from '$lib/stores/calendar.svelte';
	import { cn } from '$lib/utils/cn';

	const tabs: { id: CalendarViewTab; label: string }[] = [
		{ id: 'week', label: 'Week' },
		{ id: 'day', label: 'Day' },
		{ id: 'agendas', label: 'Agendas' }
	];

	function navLinkClass(active: boolean): string {
		return cn('z-mail-text-nav__link shrink-0', active && 'z-mail-text-nav__link--active');
	}

	function selectView(id: CalendarViewTab) {
		calendar.activeView = id;
	}
</script>

<nav
	class="flex min-w-0 items-center gap-3 md:hidden"
	aria-label="Calendar navigation"
>
	{#each tabs as tab (tab.id)}
		{@const isActive = calendar.activeView === tab.id}
		<button
			type="button"
			class={navLinkClass(isActive)}
			aria-current={isActive ? 'page' : undefined}
			onclick={() => selectView(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</nav>
