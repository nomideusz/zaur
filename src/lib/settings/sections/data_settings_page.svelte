<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="This settings UI" advanced>
		<SettingsRow
			title="Hide settings nav hints"
			description="Remove section descriptions under Display, Mail, and Account — and the local storage note"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSettingsNavHints}
				onchange={(e) => settings.setHideSettingsNavHints(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide settings panel descriptions"
			description="Remove the intro paragraph under each settings section heading on Display, Mail, and Account"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSettingsPanelDescriptions}
				onchange={(e) => settings.setHideSettingsPanelDescriptions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact settings rows"
			description="Less padding on each option row and between groups on settings pages"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSettingsRows}
				onchange={(e) => settings.setCompactSettingsRows(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact settings layout"
			description="Reduce outer padding and column gap on settings pages"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSettingsLayout}
				onchange={(e) => settings.setCompactSettingsLayout(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact settings panel"
			description="Less padding inside each settings card (Display, Mail, Account)"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSettingsPanel}
				onchange={(e) => settings.setCompactSettingsPanel(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact settings nav"
			description="Tighter sidebar and mobile tab links on settings pages"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSettingsNav}
				onchange={(e) => settings.setCompactSettingsNav(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide settings back link"
			description="Remove the Back to mail link above settings navigation"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSettingsBackLink}
				onchange={(e) => settings.setHideSettingsBackLink(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide settings page title"
			description="Remove the Settings heading above the sidebar and mobile tabs"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSettingsPageTitle}
				onchange={(e) => settings.setHideSettingsPageTitle(e.currentTarget.checked)}
			/>
		</SettingsRow>

</SettingsGroup>
