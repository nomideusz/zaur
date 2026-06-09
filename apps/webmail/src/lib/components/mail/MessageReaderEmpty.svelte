<script lang="ts">
	import { frameSvg } from '@zaur/sprite';
</script>

<div class="z-mail-pane-surface flex min-h-0 flex-1 flex-col overflow-hidden">
	<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
		<div class="text-fg-subtle select-none" aria-hidden="true">
			{@html frameSvg('look_up', { color: 'currentColor', scale: 2 })}
		</div>
	</div>
</div>
