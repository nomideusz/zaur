<script lang="ts">
	import MailWaiting from '$lib/components/mail/MailWaiting.svelte';

	let { mailboxName = null }: { mailboxName?: string | null } = $props();
</script>

<MailWaiting
	label="Opening your mail"
	hint={mailboxName && mailboxName !== 'Emails' ? mailboxName : null}
/>
