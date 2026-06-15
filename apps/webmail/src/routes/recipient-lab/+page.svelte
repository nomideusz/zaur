<script lang="ts">
	// Dev-only test fixture for ComposeRecipientInput (driven by tests/e2e/recipient-lab.spec.ts).
	// The route is 404'd in production via +page.ts.
	import ComposeRecipientInput from '$lib/components/mail/ComposeRecipientInput.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { recordContact } from '$lib/utils/contact-index';

	// Mock a signed-in client + seed contacts so the suggestion dropdown appears.
	auth.client = { getAccountId: () => 'lab' } as any;
	recordContact('lab', 'Zoe Zebra', 'zoe@example.com');
	recordContact('lab', 'Zane Zorro', 'zane@example.com');

	let value = $state('alice@example.com, bob@example.com');
</script>

<div class="z-mail-view" style="max-width: 32rem; margin: 4rem auto; font-family: sans-serif;">
	<h1>recipient-lab</h1>
	<div class="z-compose">
		<div class="z-compose__field">
			<ComposeRecipientInput
				id="lab-to"
				{value}
				placeholder="Recipients"
				class="z-compose__input"
				oninput={(next) => (value = next)}
			/>
		</div>
	</div>
	<pre data-testid="value" style="margin-top: 2rem; background:#eee; padding:1rem;">{value}</pre>
	<div data-testid="value-raw" hidden>{value}</div>

	<!-- Simulates an external value change (reply/forward/draft prefill, clear-after-send). -->
	<button data-testid="prefill" onclick={() => (value = 'erin@example.com, frank@example.com, grace@example.com')}>
		prefill
	</button>
	<button data-testid="clear" onclick={() => (value = '')}>clear</button>
</div>
