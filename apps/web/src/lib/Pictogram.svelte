<script lang="ts">
	// A pictogram band for packages with nothing worth screenshotting: one
	// large line drawing in the canvas's own icon voice (square caps, even
	// stroke, currentColor), drawn on a 48-unit grid. It says what the package
	// is for, honestly, where other nodes show a plate.
	// kind: 'scheduler' | 'payments' | 'notify' | 'search' | 'i18n' | 'media'
	let { kind, label }: { kind: string; label: string } = $props();
</script>

<div class="peek peek--picto" role="img" aria-label={label}>
	<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
		{#if kind === 'scheduler'}
			<!-- calendar page with a clock in its corner -->
			<path d="M6 10h30v28H6zM6 18h30M14 6v8M28 6v8" />
			<circle cx="36" cy="36" r="8" />
			<path d="M36 31v5h4" />
		{:else if kind === 'payments'}
			<!-- card with its magnetic stripe and chip -->
			<path d="M4 12h40v26H4zM4 19h40M10 29h8M24 29h6" />
			<path d="M34 25h6v6h-6z" />
		{:else if kind === 'notify'}
			<!-- envelope with an unread dot -->
			<path d="M5 13h38v24H5zM5 13l19 14 19-14" />
			<circle cx="40" cy="11" r="4" />
		{:else if kind === 'search'}
			<!-- magnifier over three result lines -->
			<circle cx="20" cy="20" r="12" />
			<path d="M29 29l13 13M14 17h12M14 21h12M14 25h8" />
		{:else if kind === 'i18n'}
			<!-- globe with meridians -->
			<circle cx="24" cy="24" r="17" />
			<path d="M7 24h34M24 7c6 5 6 29 0 34M24 7c-6 5-6 29 0 34M10 14h28M10 34h28" />
		{:else}
			<!-- picture frame with hills, a sun and an upload arrow -->
			<path d="M6 8h36v32H6zM6 34l12-12 10 10 6-6 8 8" />
			<circle cx="32" cy="16" r="3" />
		{/if}
	</svg>
</div>
