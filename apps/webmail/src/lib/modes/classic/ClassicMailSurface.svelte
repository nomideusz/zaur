<script lang="ts">
	import type { Snippet } from 'svelte';
	import ClassicMailLayout from '$lib/modes/classic/ClassicMailLayout.svelte';

	interface Props {
		list: Snippet;
		reader: Snippet;
		mailboxName?: string;
		onBack?: () => void;
	}

	let { list, reader, mailboxName = 'Mail', onBack }: Props = $props();
</script>

<ClassicMailLayout {list} {reader} {mailboxName} {onBack} />
