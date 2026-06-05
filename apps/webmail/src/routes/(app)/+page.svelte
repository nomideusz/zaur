<script lang="ts">
	import MailRouteShell from '$lib/components/mail/MailRouteShell.svelte';
	import MailboxListPage from '$lib/components/mail/MailboxListPage.svelte';
	import { INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
</script>

<MailRouteShell>
	<div class="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
		<MailboxListPage mailboxId={INBOX_MAILBOX_ROUTE_ID} />
	</div>
</MailRouteShell>
