<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ReaderTextSize } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
</script>

<SettingsGroup title="Contacts page" description="Tweaks for the Contacts tool." advanced>
		<SettingsRow
			title="Compact contacts page"
			description="Less padding and a smaller header on the Contacts page"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactContactsPage}
				onchange={(e) => settings.setCompactContactsPage(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact contacts list"
			description="Tighter rows in the contacts list — avatars follow the show avatars setting"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactContactsList}
				onchange={(e) => settings.setCompactContactsList(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contact message counts"
			description="Do not show how many messages you've exchanged with each contact"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactMessageCounts}
				onchange={(e) => settings.setHideContactMessageCounts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contact group letters"
			description="Remove A–Z section headings in the contacts list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactGroupLetters}
				onchange={(e) => settings.setHideContactGroupLetters(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact contacts add form"
			description="Less padding and smaller labels on the add-contact form"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactContactsAddForm}
				onchange={(e) => settings.setCompactContactsAddForm(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contacts page subtitle"
			description="Remove the description under the Contacts heading"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactsPageSubtitle}
				onchange={(e) => settings.setHideContactsPageSubtitle(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact contacts search"
			description="Smaller search field on the Contacts page"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactContactsSearch}
				onchange={(e) => settings.setCompactContactsSearch(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact contacts empty state"
			description="Less padding and smaller icon when the contacts list is empty"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactContactsEmptyState}
				onchange={(e) => settings.setCompactContactsEmptyState(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contacts settings button"
			description="Remove the Settings shortcut from the Contacts page header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactsHeaderSettings}
				onchange={(e) => settings.setHideContactsHeaderSettings(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contacts new message button"
			description="Remove the New message button from the Contacts page header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactsComposeButton}
				onchange={(e) => settings.setHideContactsComposeButton(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contacts empty hints"
			description="Remove the secondary help text when the contacts list is empty or has no search matches"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactsEmptyHints}
				onchange={(e) => settings.setHideContactsEmptyHints(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contacts empty actions"
			description="Remove Add contact and Go to inbox buttons when the contacts list is empty"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactsEmptyActions}
				onchange={(e) => settings.setHideContactsEmptyActions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contacts hover actions"
			description="Remove copy and remove buttons that appear when hovering a contact row"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactsHoverActions}
				onchange={(e) => settings.setHideContactsHoverActions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contacts row mail icon"
			description="Remove the mail icon on the right side of each contact row"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactsRowMailIcon}
				onchange={(e) => settings.setHideContactsRowMailIcon(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contacts email line"
			description="Show only contact names in the list — no email address under each name"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactsEmailLine}
				onchange={(e) => settings.setHideContactsEmailLine(e.currentTarget.checked)}
			/>
		</SettingsRow>

</SettingsGroup>
