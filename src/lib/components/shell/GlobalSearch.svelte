<script lang="ts">
	import { goto } from '$app/navigation';
	import { Search } from 'lucide-svelte';
	import { page } from '$app/stores';
	import IconButton from '$lib/components/ui/IconButton.svelte';

	let input = $state('');

	$effect(() => {
		if ($page.url.pathname === '/mail/search') {
			input = $page.url.searchParams.get('q') ?? '';
		}
	});

	function submit() {
		const query = input.trim();
		if (!query) return;
		goto(`/mail/search?q=${encodeURIComponent(query)}`);
	}
</script>

<IconButton label="Search mail" class="md:hidden" onclick={() => goto('/mail/search')}>
	<Search class="size-4" />
</IconButton>

<form
	role="search"
	class="relative mx-auto hidden w-full max-w-md md:block"
	onsubmit={(e) => {
		e.preventDefault();
		submit();
	}}
>
	<label class="sr-only" for="global-search">Search mail</label>
	<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
	<input
		id="global-search"
		type="search"
		placeholder="Search messages…"
		class="z-input pl-9"
		autocomplete="off"
		bind:value={input}
	/>
</form>
