<script lang="ts">
	import MailWaiting from '$lib/components/mail/MailWaiting.svelte';
</script>

<article
	class="z-mail-pane-surface z-mail-pane-surface--reader flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
	style="view-transition-name: message-reader;"
	role="status"
	aria-label="Opening conversation"
>
	<div class="z-reader-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<MailWaiting compact label="Opening this conversation" />
	</div>
</article>
