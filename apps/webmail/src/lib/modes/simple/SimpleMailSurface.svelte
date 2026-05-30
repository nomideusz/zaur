<script lang="ts">
	import type { Snippet } from 'svelte';
	import SimpleMailLayout from '$lib/components/mail/layout/SimpleMailLayout.svelte';

	interface Props {
		list: Snippet;
		reader: Snippet;
	}

	let { list, reader }: Props = $props();
</script>

<SimpleMailLayout {list} {reader} />
