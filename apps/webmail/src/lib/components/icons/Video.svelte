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
		d="M3 4C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H15C16.1046 20 17 19.1046 17 18V13.5L21.7892 16.8944C22.3085 17.2634 23 16.8818 23 16.2474V7.75256C23 7.11817 22.3085 6.73659 21.7892 7.10557L17 10.5V6C17 4.89543 16.1046 4 15 4H3ZM3 6H15V18H3V6ZM17.5 12.6972L21 15.0801V8.91987L17.5 11.3028V12.6972Z"
	/>
</svg>
