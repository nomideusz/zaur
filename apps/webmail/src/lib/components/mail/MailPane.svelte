<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import SimpleMailSurface from '$lib/modes/simple/SimpleMailSurface.svelte';
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
</script>

<div
	class={cn(
		'z-mail-pane flex min-w-0 flex-col',
		'z-mail-pane--page-scroll w-full',
		fullScreenMobile && 'z-mail-pane--mobile-fullscreen',
		className
	)}
>
	<SimpleMailSurface {list} {reader} />
</div>
