<script lang="ts">
	import ClassicExperience from '$lib/modes/classic/settings/experience.svelte';
	import SimpleExperience from '$lib/modes/simple/settings/experience.svelte';
	import { getWebmailModeContext } from '$lib/modes/context';

	const mode = $derived(getWebmailModeContext());
</script>

{#if mode.settings.editorial}
	<SimpleExperience />
{:else}
	<ClassicExperience />
{/if}
