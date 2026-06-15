<script lang="ts">
	// Dev-only playground for the SettingsSearch combobox. The route is 404'd in
	// production via +page.ts. No seeding needed: the registry's allEntries() always
	// merges the static SETTINGS_SEARCH_INDEX, so typing produces results immediately.
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';

	const resultCount = $derived(settingsSearch.filtered().length);
</script>

<div style="max-width: 28rem; margin: 4rem auto; font-family: sans-serif;">
	<h1 style="margin-bottom: 1.5rem;">settings-search-lab</h1>

	<p style="margin-bottom: 1rem; font-size: 0.875rem; opacity: 0.7;">
		Type e.g. "account", "theme", "notification". ArrowDown into the list, Enter
		navigates to the setting (will route away from this lab — expected).
	</p>

	<div data-testid="settings-search">
		<SettingsSearch />
	</div>

	<pre data-testid="state" style="margin-top: 2rem; background:#eee; padding:1rem; font-size: 0.8rem;">query: {JSON.stringify(settingsSearch.query)}
results: {resultCount}</pre>
</div>
