<script lang="ts">
	import { Search } from 'lucide-svelte';
</script>

<form role="search" class="relative mx-auto hidden w-full max-w-md md:block" onsubmit={(e) => e.preventDefault()}>
	<label class="sr-only" for="global-search">Search mail</label>
	<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
	<input
		id="global-search"
		type="search"
		placeholder="Search messages…"
		class="z-input pl-9"
		autocomplete="off"
	/>
</form>
