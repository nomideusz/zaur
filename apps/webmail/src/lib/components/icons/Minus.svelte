<script lang="ts">
	interface Props extends svelteHTML.SVGAttributes<SVGSVGElement> {}
	let { class: className = '', ...rest }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="currentColor"
	class={className}
	{...rest}
>
	<path d="M5 11H19V13H5V11Z"/>
</svg>
