<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import SimpleMailLayout from '$lib/components/mail/layout/SimpleMailLayout.svelte';
	import TraditionalMailLayout from '$lib/components/mail/layout/TraditionalMailLayout.svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { isTraditionalMailView } from '$lib/mail/view-mode';
	import { settings } from '$lib/stores/settings.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxName: string;
		countLabel: string;
		mailboxRouteId?: string;
		loading?: boolean;
		error?: string | null;
		messageCount?: number;
		onBulkAction?: () => void;
		onBack?: () => void;
		showNewMessage?: boolean;
		fullScreenMobile?: boolean;
		list: Snippet;
		reader: Snippet;
		class?: string;
	}

	let {
		mailboxName,
		countLabel,
		mailboxRouteId,
		loading = false,
		error = null,
		messageCount = 0,
		onBulkAction,
		onBack,
		showNewMessage = true,
		fullScreenMobile = false,
		list,
		reader,
		class: className = ''
	}: Props = $props();

	let showImagesOnce = $state(false);

	setContext<MailPaneContext>(MAIL_PANE_CTX, {
		get showImagesOnce() {
			return showImagesOnce;
		},
		setShowImagesOnce(value: boolean) {
			showImagesOnce = value;
		}
	});

	$effect(() => {
		const generation = shellHeader.setMail({
			mailboxName,
			countLabel,
			mailboxRouteId,
			loading,
			error,
			messageCount,
			onBulkAction,
			onBack,
			showNewMessage
		});
		return () => shellHeader.clearMail(generation);
	});

	const traditional = $derived(isTraditionalMailView(settings.mailViewMode));
</script>

<div
	class={cn(
		'z-mail-pane flex min-h-0 min-w-0 flex-1 flex-col',
		fullScreenMobile && 'z-mail-pane--mobile-fullscreen',
		className
	)}
>
	{#if traditional}
		<TraditionalMailLayout {list} {reader} {mailboxName} {onBack} />
	{:else}
		<SimpleMailLayout {list} {reader} />
	{/if}
</div>
