<script lang="ts">
	import { renderMessageBody } from '$lib/email/html';

	interface Props {
		bodyHtml?: string;
		bodyText: string;
		allowExternal: boolean;
	}

	let { bodyHtml, bodyText, allowExternal }: Props = $props();

	const rendered = $derived(renderMessageBody({ bodyHtml, bodyText, allowExternal }));
</script>

<div
	class="z-email-body mx-auto max-w-(--z-reader-measure) text-sm leading-relaxed text-fg"
	class:whitespace-pre-wrap={!rendered.isHtml}
>
	{@html rendered.html}
</div>
