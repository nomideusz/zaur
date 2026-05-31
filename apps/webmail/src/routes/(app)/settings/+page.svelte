<script lang="ts">
	import { goto } from '$app/navigation';

	$effect(() => {
		void goto('/settings/account', { replaceState: true });
	});
</script>
