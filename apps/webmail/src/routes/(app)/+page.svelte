<script lang="ts">
	import MailRouteShell from '$lib/components/mail/MailRouteShell.svelte';
	import MailboxListPage from '$lib/components/mail/MailboxListPage.svelte';
	import { INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
</script>

<MailRouteShell>
	<MailboxListPage mailboxId={INBOX_MAILBOX_ROUTE_ID} />
</MailRouteShell>
