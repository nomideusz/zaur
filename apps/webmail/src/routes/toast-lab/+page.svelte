<script lang="ts">
	// Dev-only playground + e2e fixture for the Ark-toast ToastStack (see
	// tests/e2e/toast-lab.spec.ts). 404'd in production via +page.ts. Mounts ToastStack
	// directly (it normally lives in the (app) layout) and fires each toast shape so the
	// bottom-centre placement, stacking (max 2), variants, and Undo can be exercised.
	import ToastStack from '$lib/components/ui/ToastStack.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let n = $state(0);
	let undone = $state(false);
</script>

<div style="max-width: 28rem; margin: 4rem auto; font-family: sans-serif; display: flex; flex-direction: column; gap: 0.75rem;">
	<h1>toast-lab</h1>
	<p style="font-size: 0.875rem; opacity: 0.7;">
		Fire toasts and watch them stack bottom-centre (max 2, newest queues). Hover the
		Undo toast to confirm dismissal pauses.
	</p>

	<button data-testid="fire-info" onclick={() => toast.show(`Info message ${++n}`, 'info')}>info</button>
	<button data-testid="fire-success" onclick={() => toast.show(`Saved ${++n}`, 'success')}>success</button>
	<button data-testid="fire-error" onclick={() => toast.show(`Something failed ${++n}`, 'error')}>error</button>
	<button
		data-testid="fire-quick"
		onclick={() => toast.showAction(`Quick ${++n}`, 'info', undefined, 800)}
	>
		quick (800ms auto-dismiss)
	</button>
	<button
		data-testid="fire-undo"
		onclick={() => {
			undone = false;
			toast.showUndo(`Sending "Draft ${++n}"…`, () => (undone = true), 8000);
		}}
	>
		undo
	</button>
	<button data-testid="dismiss-all" onclick={() => toast.reset()}>dismiss all</button>

	<div data-testid="undo-result">{undone ? 'undone' : 'idle'}</div>
</div>

<ToastStack />
