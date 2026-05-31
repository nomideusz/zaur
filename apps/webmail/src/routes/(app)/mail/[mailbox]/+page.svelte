<script lang="ts">
	import MailboxListPage from '$lib/components/mail/MailboxListPage.svelte';

	const { data } = $props();
</script>

<MailboxListPage mailboxId={data.mailboxId} />
