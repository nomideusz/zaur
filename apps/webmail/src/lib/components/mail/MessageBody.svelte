<script lang="ts">
	import { renderMessageBody } from '$lib/email/html';
	import { readerFocus } from '$lib/stores/reader-focus.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';

	interface Props {
		bodyHtml?: string;
		bodyText: string;
		allowExternal: boolean;
	}

	let { bodyHtml, bodyText, allowExternal }: Props = $props();

	const rendered = $derived(
		renderMessageBody({
			bodyHtml,
			bodyText,
			allowExternal,
			darkMode: theme.resolved === 'dark',
			preferPlainText: settings.preferPlainText,
			cleanView: readerFocus.clean
		})
	);
</script>

<div
	class="z-email-body w-full"
	class:z-email-body--html={rendered.isHtml}
	class:z-email-body--plain={!rendered.isHtml}
	class:z-email-body--light={rendered.lightSurface}
	class:whitespace-pre-wrap={!rendered.isHtml}
>
	{@html rendered.html}
</div>
