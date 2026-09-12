<script lang="ts">
	import '@fontsource/libre-franklin/400.css';
	import '@fontsource/libre-franklin/500.css';
	import '@fontsource/libre-franklin/600.css';
	import './styles/tokens.css';
	import './styles/base.css';

	let { children } = $props();
</script>

{@render children()}
