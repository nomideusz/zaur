<script lang="ts">
	import MailRouteShell from '$lib/components/mail/MailRouteShell.svelte';

	let { children } = $props();
</script>

<MailRouteShell>
	<div class="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
		{@render children()}
	</div>
</MailRouteShell>
