<script lang="ts">
	// Dev-only playground for the Ark-toast ToastStack. 404'd in production via +page.ts.
	// Mounts ToastStack directly (it normally lives in the (app) layout) and fires each
	// toast shape so the bottom-centre placement, stacking (max 2), variants, and the
	// Undo countdown can be eyeballed.
	import ToastStack from '$lib/components/ui/ToastStack.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let n = $state(0);
</script>

<div style="max-width: 28rem; margin: 4rem auto; font-family: sans-serif; display: flex; flex-direction: column; gap: 0.75rem;">
	<h1>toast-lab</h1>
	<p style="font-size: 0.875rem; opacity: 0.7;">
		Fire toasts and watch them stack bottom-centre (max 2, newest queues). Hover the
		Undo toast to confirm dismissal pauses.
	</p>

	<button onclick={() => toast.show(`Info message ${++n}`, 'info')}>info</button>
	<button onclick={() => toast.show(`Saved ${++n}`, 'success')}>success</button>
	<button onclick={() => toast.show(`Something failed ${++n}`, 'error')}>error</button>
	<button onclick={() => toast.showUndo(`Sending "Draft ${++n}"…`, () => alert('undo!'), 8000)}>
		undo (8s countdown)
	</button>
	<button onclick={() => toast.reset()}>dismiss all</button>
</div>

<ToastStack />
