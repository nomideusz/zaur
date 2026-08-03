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
	<path
		d="M3 3C2.44772 3 2 3.44772 2 4V7C2 7.55228 2.44772 8 3 8H4V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V8H21C21.5523 8 22 7.55228 22 7V4C22 3.44772 21.5523 3 21 3H3ZM18 8H6V19H18V8ZM4 5H20V6H4V5ZM9 11H15V13H9V11Z"
	/>
</svg>
