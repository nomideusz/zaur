<script lang="ts">
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
</script>

<!-- Lean island browse mode — compose only; filters/accounts live in MobileTopBar. -->
<div class="z-mobile-island__tabs z-mobile-island__tabs--compose" data-testid="island-compose">
	<a
		href="/mail/compose"
		class="z-mobile-island__compose-pill"
		aria-label="New message"
	>
		<PenSquare class="size-[1.125rem]" aria-hidden="true" />
		<span>New</span>
	</a>
</div>
