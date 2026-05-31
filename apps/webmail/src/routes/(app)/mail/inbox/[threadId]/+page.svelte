<script lang="ts">
	import MailboxThreadPage from '$lib/components/mail/MailboxThreadPage.svelte';

	const { data } = $props();
</script>

<MailboxThreadPage mailboxId={data.mailboxId} threadId={data.threadId} />
