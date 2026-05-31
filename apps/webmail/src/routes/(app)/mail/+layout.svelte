<script lang="ts">
	import MailRouteShell from '$lib/components/mail/MailRouteShell.svelte';

	let { children } = $props();
</script>

<MailRouteShell>
	{@render children()}
</MailRouteShell>
