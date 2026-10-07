<script lang="ts">
	// svelte-qr's node shows the package doing its job: this QR is encoded by
	// the package itself when the page is built, no image involved, and it
	// opens zaur.app when scanned.
	import { QrCode } from '@nomideusz/svelte-qr';

	let { data = 'https://zaur.app' }: { data?: string } = $props();
</script>

<div class="peek peek--qr">
	<QrCode {data} size={120} padding={2} foreground="#121633" background="#f6f7fb" label="QR code for {data}, encoded by svelte-qr" />
	<span class="peek__badge">Encoded by svelte-qr · scan it</span>
</div>
