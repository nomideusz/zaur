<script lang="ts">
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReaderEmpty from '$lib/components/mail/MessageReaderEmpty.svelte';
	import { mockMessages } from '$lib/mocks/inbox';
	import { mail } from '$lib/stores/mail.svelte';

	const { data } = $props();

	const mailbox = $derived(mail.mailboxByRouteId(data.mailboxId));
	const mailboxName = $derived(mailbox?.name ?? 'Inbox');
	const messages = $derived(
		mockMessages.filter((m) => m.mailboxId === data.mailboxId || m.mailboxId === mailbox?.role)
	);
</script>

<svelte:head>
	<title>{mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailboxSidebar />
<MessageList {messages} {mailboxName} />
<MessageReaderEmpty />
