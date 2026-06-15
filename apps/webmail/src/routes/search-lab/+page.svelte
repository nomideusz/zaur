<script lang="ts">
	// Dev-only playground for the GlobalSearchCombobox prototype.
	// The route is 404'd in production via +page.ts.
	import GlobalSearchCombobox from '$lib/components/shell/GlobalSearchCombobox.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { recordContact } from '$lib/utils/contact-index';

	// Mock a signed-in client + seed contacts so the suggestion dropdown has data.
	auth.client = { getAccountId: () => 'lab' } as any;
	auth.username = 'me@example.com';
	recordContact('lab', 'Zoe Zebra', 'zoe@example.com');
	recordContact('lab', 'Zane Zorro', 'zane@example.com');
	recordContact('lab', 'Alice Anteater', 'alice@example.com');
</script>

<div style="max-width: 36rem; margin: 4rem auto; font-family: sans-serif;">
	<h1 style="margin-bottom: 1.5rem;">search-lab</h1>

	<p style="margin-bottom: 0.5rem; font-size: 0.875rem; opacity: 0.7;">
		Empty input → quick filters · type a letter → "Search for…" + contact matches.
		ArrowDown into the list, Enter on a plain query submits the search.
	</p>

	<div data-testid="shell-search">
		<GlobalSearchCombobox placement="shell" autofocus />
	</div>

	<div style="margin-top: 3rem;">
		<p style="margin-bottom: 0.5rem; font-size: 0.875rem; opacity: 0.7;">Sidebar placement:</p>
		<div data-testid="sidebar-search" style="max-width: 16rem;">
			<GlobalSearchCombobox placement="sidebar" />
		</div>
	</div>

	<div style="margin-top: 3rem;">
		<p style="margin-bottom: 0.5rem; font-size: 0.875rem; opacity: 0.7;">
			Mobile placement (plain input, no dropdown):
		</p>
		<div data-testid="mobile-search" style="max-width: 20rem;">
			<GlobalSearchCombobox placement="mobile" />
		</div>
	</div>
</div>
