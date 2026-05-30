<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import ClassicMailSurface from '$lib/modes/classic/ClassicMailSurface.svelte';
	import { webmailModeDefinition } from '$lib/modes/registry';
	import SimpleMailSurface from '$lib/modes/simple/SimpleMailSurface.svelte';
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

	const activeMode = $derived(webmailModeDefinition(settings.mailViewMode));
</script>

<div
	class={cn(
		'z-mail-pane flex min-h-0 min-w-0 flex-1 flex-col',
		fullScreenMobile && 'z-mail-pane--mobile-fullscreen',
		className
	)}
>
	{#key activeMode.id}
		{#if activeMode.id === 'traditional'}
			<ClassicMailSurface {list} {reader} {mailboxName} {onBack} />
		{:else}
			<SimpleMailSurface {list} {reader} />
		{/if}
	{/key}
</div>
