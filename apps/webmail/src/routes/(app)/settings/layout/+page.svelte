<script lang="ts">
	import { goto } from '$app/navigation';
	import { settings } from '$lib/stores/settings.svelte';

	$effect(() => {
		void goto('/settings/reading', {
			replaceState: true
		});
	});
</script>
