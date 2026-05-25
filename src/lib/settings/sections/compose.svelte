<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ComposeLayout } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Writing email" description="Compose panel and recipient fields.">
		<SettingsRow
			title="Compose layout"
			description="Drawer slides over mail on desktop — pane keeps the folder sidebar visible while you write"
		>
			<select
				class="z-input w-auto"
				value={settings.composeLayout}
				onchange={(e) => settings.setComposeLayout(e.currentTarget.value as ComposeLayout)}
			>
				<option value="drawer">Drawer</option>
				<option value="pane">Pane (sidebar visible)</option>
			</select>
		</SettingsRow>

		<SettingsRow
			title="Hide compose hints"
			description="Remove nudges like “Set display name”, “Add a signature”, and keyboard shortcut tips"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideComposeHints}
				onchange={(e) => settings.setHideComposeHints(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Collapse quoted text"
			description="Keep quoted reply content folded when composing"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.collapseQuotedInCompose}
				onchange={(e) => settings.setCollapseQuotedInCompose(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Show Cc/Bcc fields"
			description="Cc and Bcc rows in compose — reply-all still shows Cc when needed"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showCcBccInCompose}
				onchange={(e) => settings.setShowCcBccInCompose(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide From line in compose"
			description="Remove the sender row at the top of the compose panel"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideComposeFromLine}
				onchange={(e) => settings.setHideComposeFromLine(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide compose field labels"
			description="Remove To, Cc, Bcc, and Subject labels — fields stay usable with placeholders"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideComposeFieldLabels}
				onchange={(e) => settings.setHideComposeFieldLabels(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsDepends
			enabled={settings.composeLayout === 'drawer'}
			inactiveReason={settings.composeLayout === 'drawer'
				? 'Drawer width on desktop'
				: 'Only applies when compose layout is set to drawer'}
		>
			<SettingsRow
				title="Compact compose panel"
				description="Narrower compose drawer on desktop — more room beside the message list"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.compactComposePanel}
					onchange={(e) => settings.setCompactComposePanel(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>

		<SettingsRow
			title="Icon-only attach button"
			description="Show only the paperclip icon for attachments in compose — no “Attach” label"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.iconOnlyComposeAttach}
				onchange={(e) => settings.setIconOnlyComposeAttach(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Icon-only discard button"
			description="Show an X icon instead of the Discard label in compose"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.iconOnlyComposeDiscard}
				onchange={(e) => settings.setIconOnlyComposeDiscard(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide compose panel borders"
			description="Remove divider lines between header, fields, and footer in compose"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideComposePanelBorders}
				onchange={(e) => settings.setHideComposePanelBorders(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact compose attachments"
			description="Tighter spacing and smaller chips for files attached in compose"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactComposeAttachments}
				onchange={(e) => settings.setCompactComposeAttachments(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact attachments"
			description="Smaller attachment chips without the count label or file sizes — in reader and compose"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactAttachments}
				onchange={(e) => settings.setCompactAttachments(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compose contact suggestions"
			description="Autocomplete contacts while typing recipients"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showComposeContactSuggestions}
				onchange={(e) => settings.setShowComposeContactSuggestions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsDepends
			enabled={settings.showComposeContactSuggestions}
			inactiveReason={settings.showComposeContactSuggestions
				? 'Recipient suggestions appearance'
				: 'Turn on compose contact suggestions above to adjust spacing'}
		>
			<SettingsRow
				title="Compact compose suggestions"
				description="Tighter spacing in recipient autocomplete while composing"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.compactComposeSuggestions}
					onchange={(e) => settings.setCompactComposeSuggestions(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>

</SettingsGroup>
