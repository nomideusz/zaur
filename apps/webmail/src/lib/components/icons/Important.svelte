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
	<path d="M4 15V3.99999C4 3.44771 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 3.99999V15C20 15.5523 19.5523 16 19 16H12.003L8.00293 19.9991L9.00293 16H5C4.44772 16 4 15.5523 4 15ZM6 5V13H18V5H6Z"/>
</svg>
