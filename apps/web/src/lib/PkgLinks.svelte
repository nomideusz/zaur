<script lang="ts">
	// A package's Docs and Source, in its head beside the name that links to npm.
	import { t } from '#lib/i18n';

	let { docs, source }: { docs?: string; source?: string } = $props();
</script>

{#if docs || source}
	<span class="links">
		{#if docs}<a href={docs}>{t('packages.docs')}</a>{/if}
		{#if source}<a href={source}>{t('packages.source')}</a>{/if}
	</span>
{/if}

<style>
	.links {
		display: inline-flex;
		gap: 0.75rem;
		margin-left: auto;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0;
	}
	@media (pointer: coarse) {
		a {
			display: inline-flex;
			align-items: center;
			min-height: 2.75rem;
		}
	}
</style>
