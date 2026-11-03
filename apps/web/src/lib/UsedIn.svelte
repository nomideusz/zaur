<script lang="ts" module>
	/** "Used in A and B", split so that each name can be a link. No `after` while the page shows its keys. */
	export type UsedList = { before: string; after?: string; parts: { text: string; href?: string }[] };
</script>

<script lang="ts">
	let { list }: { list: UsedList } = $props();
</script>

{list.before}{#if list.after !== undefined}{#each list.parts as p, i (i)}{#if p.href}<a href={p.href}>{p.text}</a>{:else}{p.text}{/if}{/each}{list.after}{/if}
