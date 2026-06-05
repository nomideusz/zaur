<script lang="ts">
	import MailRouteShell from '$lib/components/mail/MailRouteShell.svelte';
	import MailboxListPage from '$lib/components/mail/MailboxListPage.svelte';
	import FoldersListPage from '$lib/components/mail/FoldersListPage.svelte';
	import { INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';

	let isMobile = $state(false);

	$effect(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});
</script>

<MailRouteShell>
	<div class="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
		{#if isMobile}
			<FoldersListPage />
		{:else}
			<MailboxListPage mailboxId={INBOX_MAILBOX_ROUTE_ID} />
		{/if}
	</div>
</MailRouteShell>
