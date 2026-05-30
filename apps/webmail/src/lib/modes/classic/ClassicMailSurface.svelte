<script lang="ts">
	import type { Snippet } from 'svelte';
	import TraditionalMailLayout from '$lib/components/mail/layout/TraditionalMailLayout.svelte';

	interface Props {
		list: Snippet;
		reader: Snippet;
		mailboxName?: string;
		onBack?: () => void;
	}

	let { list, reader, mailboxName = 'Mail', onBack }: Props = $props();
</script>

<TraditionalMailLayout {list} {reader} {mailboxName} {onBack} />
