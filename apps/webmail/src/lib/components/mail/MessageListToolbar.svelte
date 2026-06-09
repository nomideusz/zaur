<script lang="ts">
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		disabled?: boolean;
		class?: string;
	}

	let { disabled = false, class: className = '' }: Props = $props();
</script>

<nav
	class={cn(
		'z-mail-list-toolbar flex w-full min-w-0 items-center',
		disabled && 'pointer-events-none opacity-60',
		className
	)}
	aria-label="Message list"
>
	<div class="z-mail-list-toolbar__selectors">
		<div class="z-mail-list-checkbox-col">
			<MessageListMasterCheckbox class="z-mail-list-bulk-bar__checkbox" />
		</div>
		<MessageListSelectMenu {disabled} />
	</div>
	<div class="z-header-action-zone">
		<a href="/mail/compose" class="z-mail-text-nav__action">New message</a>
	</div>
</nav>
