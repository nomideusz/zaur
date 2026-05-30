<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings, type SearchScope } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>


<SettingsGroup
	title="Mail view"
	description="Choose between the new Simple Experience or Classic Traditional layout."
>
	<SettingsField
		title="Mail view"
		description="Switch between the new simple experience and the classic 3-pane layout"
	>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 w-full">
			<button
				type="button"
				role="radio"
				aria-checked={settings.mailViewMode === 'simple'}
				class={cn(
					'group flex flex-col items-stretch p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
					settings.mailViewMode === 'simple'
						? 'border-accent bg-accent/5 ring-1 ring-accent'
						: 'border-border/60 bg-surface hover:border-border-strong hover:bg-surface-raised hover:shadow-sm'
				)}
				onclick={() => settings.setMailViewMode('simple')}
			>
				<div class="w-full h-28 bg-surface-sunken border border-border/40 rounded-lg p-2 flex flex-col gap-1.5 relative overflow-hidden transition-colors group-hover:border-border/70">
					<!-- Mini header -->
					<div class="h-4 bg-surface border-b border-border/40 flex items-center justify-between px-2 rounded-xs">
						<div class="flex items-center gap-1.5">
							<div class="w-5 h-1 bg-fg-muted/30 rounded-2xs"></div>
							<!-- Core Folders Switcher -->
							<div class="flex items-center gap-0.5">
								<div class="w-6 h-2 bg-accent/10 border border-accent/20 rounded-2xs flex items-center justify-center">
									<div class="w-3 h-0.5 bg-accent/70 rounded-2xs"></div>
								</div>
								<div class="w-5 h-2 rounded-2xs flex items-center justify-center">
									<div class="w-3 h-0.5 bg-fg-muted/30 rounded-2xs"></div>
								</div>
								<div class="w-5 h-2 rounded-2xs flex items-center justify-center">
									<div class="w-3 h-0.5 bg-fg-muted/30 rounded-2xs"></div>
								</div>
							</div>
						</div>
						<div class="w-12 h-2 bg-surface-sunken border border-border/30 rounded-2xs flex items-center px-1">
							<div class="w-4 h-0.5 bg-fg-muted/20 rounded-2xs"></div>
						</div>
						<div class="size-2 rounded-full bg-fg-muted/40"></div>
					</div>
					<!-- Main body: Spacious full-width list -->
					<div class="flex-1 bg-surface border border-border/40 rounded-xs p-1.5 flex flex-col gap-1.5">
						<div class="h-3 bg-surface-sunken border border-border/20 rounded-2xs w-full flex items-center justify-between px-1.5">
							<div class="w-1/3 h-1 bg-fg/70 rounded-2xs"></div>
							<div class="w-1/2 h-0.5 bg-fg-muted/40 rounded-2xs"></div>
						</div>
						<div class="h-3 bg-surface-sunken border border-border/20 rounded-2xs w-full flex items-center justify-between px-1.5">
							<div class="w-1/4 h-1 bg-fg/50 rounded-2xs"></div>
							<div class="w-3/5 h-0.5 bg-fg-muted/40 rounded-2xs"></div>
						</div>
						<div class="h-3 bg-surface-sunken border border-border/20 rounded-2xs w-full flex items-center justify-between px-1.5">
							<div class="w-1/3 h-1 bg-fg/50 rounded-2xs"></div>
							<div class="w-2/5 h-0.5 bg-fg-muted/40 rounded-2xs"></div>
						</div>
					</div>
				</div>
				<div class="mt-3.5 flex items-center justify-between">
					<span class="font-semibold text-fg text-sm">Simple Experience</span>
					<div class={cn(
						'size-5 rounded-full border flex items-center justify-center transition-all duration-200',
						settings.mailViewMode === 'simple'
							? 'border-accent bg-accent text-accent-fg scale-100'
							: 'border-border-strong bg-surface scale-90 group-hover:scale-100 group-hover:border-fg'
					)}>
						{#if settings.mailViewMode === 'simple'}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M20 6 9 17l-5-5"/></svg>
						{/if}
					</div>
				</div>
				<p class="text-xs text-fg-muted mt-1 leading-relaxed">
					Focuses on one view at a time with a clean layout and adaptive reading pane. Ideal for simple and focused workflows.
				</p>
			</button>

			<button
				type="button"
				role="radio"
				aria-checked={settings.mailViewMode === 'traditional'}
				class={cn(
					'group flex flex-col items-stretch p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
					settings.mailViewMode === 'traditional'
						? 'border-accent bg-accent/5 ring-1 ring-accent'
						: 'border-border/60 bg-surface hover:border-border-strong hover:bg-surface-raised hover:shadow-sm'
				)}
				onclick={() => settings.setMailViewMode('traditional')}
			>
				<div class="w-full h-28 bg-surface-sunken border border-border/40 rounded-lg p-2 flex flex-col gap-1.5 relative overflow-hidden transition-colors group-hover:border-border/70">
					<!-- Mini header -->
					<div class="h-4 bg-surface border-b border-border/40 flex items-center justify-between px-2 rounded-xs">
						<div class="flex items-center gap-1.5">
							<div class="w-5 h-1 bg-fg-muted/30 rounded-2xs"></div>
							<!-- Global Tool Switcher tabs -->
							<div class="flex items-center gap-0.5">
								<div class="w-6 h-2 bg-accent/10 border border-accent/20 rounded-2xs flex items-center justify-center">
									<div class="w-3 h-0.5 bg-accent/70 rounded-2xs"></div>
								</div>
								<div class="w-6 h-2 rounded-2xs flex items-center justify-center">
									<div class="w-3 h-0.5 bg-fg-muted/30 rounded-2xs"></div>
								</div>
								<div class="w-6 h-2 rounded-2xs flex items-center justify-center">
									<div class="w-3 h-0.5 bg-fg-muted/30 rounded-2xs"></div>
								</div>
							</div>
						</div>
						<div class="w-12 h-2 bg-surface-sunken border border-border/30 rounded-2xs flex items-center px-1">
							<div class="w-4 h-0.5 bg-fg-muted/20 rounded-2xs"></div>
						</div>
						<div class="size-2 rounded-full bg-fg-muted/40"></div>
					</div>
					<!-- Main body: 3 pane columns -->
					<div class="flex-1 flex gap-1">
						<!-- Sidebar (folders) -->
						<div class="w-1/5 bg-surface border border-border/40 rounded-xs flex flex-col gap-1 p-1">
							<div class="h-1.5 bg-accent/15 border border-accent/25 rounded-2xs w-full"></div>
							<div class="flex flex-col gap-0.5">
								<div class="h-0.5 bg-fg-muted/40 rounded-2xs w-full"></div>
								<div class="h-0.5 bg-fg-muted/40 rounded-2xs w-3/4"></div>
								<div class="h-0.5 bg-fg-muted/40 rounded-2xs w-5/6"></div>
							</div>
						</div>
						<!-- List pane -->
						<div class="w-1/3 bg-surface border border-border/40 rounded-xs flex flex-col gap-0.5 p-1">
							<div class="h-1 bg-fg/70 rounded-2xs w-1/2 mb-0.5"></div>
							<div class="h-3 bg-surface-sunken border border-border/20 rounded-2xs w-full flex flex-col justify-center gap-0.5 p-0.5">
								<div class="w-5/6 h-0.5 bg-fg/60 rounded-2xs"></div>
								<div class="w-1/2 h-0.5 bg-fg-muted/40 rounded-2xs"></div>
							</div>
							<div class="h-3 bg-surface-sunken border border-border/20 rounded-2xs w-full flex flex-col justify-center gap-0.5 p-0.5">
								<div class="w-2/3 h-0.5 bg-fg/40 rounded-2xs"></div>
								<div class="w-1/2 h-0.5 bg-fg-muted/40 rounded-2xs"></div>
							</div>
							<div class="h-3 bg-surface-sunken border border-border/20 rounded-2xs w-full flex flex-col justify-center gap-0.5 p-0.5">
								<div class="w-3/4 h-0.5 bg-fg/40 rounded-2xs"></div>
								<div class="w-1/2 h-0.5 bg-fg-muted/40 rounded-2xs"></div>
							</div>
						</div>
						<!-- Reader pane -->
						<div class="flex-1 bg-surface border border-border/40 rounded-xs p-1 flex flex-col gap-1">
							<div class="w-3/4 h-1 bg-fg/80 rounded-2xs"></div>
							<div class="w-1/2 h-0.5 bg-fg-muted/30 rounded-2xs"></div>
							<div class="flex-1 border-t border-border/30 pt-0.5 flex flex-col gap-0.5">
								<div class="w-full h-0.5 bg-fg-muted/20 rounded-2xs"></div>
								<div class="w-full h-0.5 bg-fg-muted/20 rounded-2xs"></div>
								<div class="w-5/6 h-0.5 bg-fg-muted/20 rounded-2xs"></div>
							</div>
						</div>
					</div>
				</div>
				<div class="mt-3.5 flex items-center justify-between">
					<span class="font-semibold text-fg text-sm">Classic Traditional</span>
					<div class={cn(
						'size-5 rounded-full border flex items-center justify-center transition-all duration-200',
						settings.mailViewMode === 'traditional'
							? 'border-accent bg-accent text-accent-fg scale-100'
							: 'border-border-strong bg-surface scale-90 group-hover:scale-100 group-hover:border-fg'
					)}>
						{#if settings.mailViewMode === 'traditional'}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M20 6 9 17l-5-5"/></svg>
						{/if}
					</div>
				</div>
				<p class="text-xs text-fg-muted mt-1 leading-relaxed">
					Classic 3-pane layout. Folders sidebar, message list, and reading pane are all visible side-by-side on desktop.
				</p>
			</button>
		</div>
	</SettingsField>
</SettingsGroup>

<SettingsGroup title="Navigation" description="Where mail opens and how search behaves.">
	<SettingsRow title="Remember last mailbox" description="Open your last folder instead of Inbox when signing in">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.rememberLastMailbox}
			onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

{#if settings.mailViewMode === 'traditional'}
	<SettingsGroup title="Folder sidebar" description="Mailbox list on the left.">
		<SettingsRow title="Show folder unread counts" description="Unread badges on folders">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.showFolderUnreadCounts}
				onchange={(e) => settings.setShowFolderUnreadCounts(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>
{/if}

<SettingsGroup title="Search">
	<SettingsRow
		title="Default search scope"
		description="Start in the current folder when searching from a mailbox view, or always look everywhere"
	>
		<SettingsSelect
			label="Default search scope"
			value={settings.searchScope}
			options={[
				{ value: 'all', label: 'All mail' },
				{ value: 'current-folder', label: 'Current folder' }
			]}
			onchange={(v) => settings.setSearchScope(v as SearchScope)}
			class="w-auto"
		/>
	</SettingsRow>
</SettingsGroup>

{#if settings.mailViewMode === 'simple'}
	<SettingsGroup title="Simple layout options" description="Customize your Simple view experience.">
		<SettingsRow title="Show list rail in reader" description="Keep a slim message list visible on the side when reading on desktop">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.showReaderListRail}
				onchange={(e) => settings.setShowReaderListRail(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>
{/if}

{#if settings.mailViewMode === 'traditional'}
	<SettingsGroup title="Panes" description="Desktop layout for sidebar, message list, and reader.">
		<SettingsRow title="Show pane borders" description="Divider lines between sidebar, list, and reader">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={!settings.hidePaneBorders}
				onchange={(e) => settings.setHidePaneBorders(!e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>
{/if}

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset layout settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset layout settings to defaults?')) {
					settings.resetWorkspaceSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>

