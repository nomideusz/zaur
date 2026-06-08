<script lang="ts">
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
</script>

<!-- Mobile-only compose action, anchored above the bottom nav. -->
<a href="/mail/compose" class="z-compose-fab md:hidden" aria-label="New message" title="New message">
	<PenSquare class="size-5 shrink-0" aria-hidden="true" />
</a>
