<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import type { MailboxDTO } from '#lib/mail/types';

	interface Props {
		mailboxes: MailboxDTO[] | undefined;
		activeMailbox: MailboxDTO | null;
		onSelectMailbox: (id: string) => void;
		account: { username: string; displayName: string | null } | null;
	}

	let { mailboxes, activeMailbox, onSelectMailbox, account }: Props = $props();

	let searchInput = $state<HTMLInputElement | undefined>();
	let navButtons = $state<Record<string, HTMLElement>>({});
	let indicator = $state({ left: 0, width: 0, ready: false });

	const initialsOf = (name: string, email: string) => {
		const source = name.trim() || email.trim();
		if (!source) return '?';
		if (!name.trim() && source.includes('@'))
			return source.slice(0, source.indexOf('@')).slice(0, 2).toUpperCase();
		const parts = source.split(/[\s@._-]+/).filter(Boolean);
		return parts.length === 1
			? source.slice(0, 2).toUpperCase()
			: ((parts[0]![0] ?? '') + (parts[1]![0] ?? '')).toUpperCase();
	};

	const accountInitials = $derived(
		account ? initialsOf(account.displayName ?? '', account.username) : '·'
	);

	// The nav indicator is measured from the active button's rect and slides between items.
	$effect(() => {
		const button = navButtons['mail'];
		if (!button) return;
		indicator = { left: button.offsetLeft, width: button.offsetWidth, ready: true };
	});

	function focusSearch() {
		searchInput?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === '/' && document.activeElement !== searchInput) {
			event.preventDefault();
			focusSearch();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<header
	class="flex h-[60px] shrink-0 items-center gap-3.5 border-b border-line bg-canvas px-5"
>
	<div class="flex items-center gap-2">
		<div class="size-5 rounded-[6px] bg-accent"></div>
		<div class="text-base font-semibold tracking-[-0.01em]">Zaur Mail</div>
	</div>

	{#if mailboxes}
		<Menu.Root positioning={{ placement: 'bottom-start', gutter: 8, overflowPadding: 12 }} lazyMount unmountOnExit>
			<Menu.Trigger
				class="inline-flex h-8 items-center gap-2 rounded-[8px] px-[11px] py-[9px] text-[14px] font-medium transition-colors duration-[160ms] data-highlighted:bg-divider hover:bg-divider"
			>
				<span class="max-w-40 truncate">{activeMailbox?.name ?? 'Folder'}</span>
				{#if activeMailbox && activeMailbox.unread > 0}
					<span class="text-xs text-ink-secondary tabular-nums">{activeMailbox.unread}</span>
				{/if}
				<svg class="size-3.5 text-ink-secondary" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</Menu.Trigger>
			<Portal>
				<Menu.Positioner>
					<Menu.Content
						class="z-40 w-60 rounded-[10px] border border-line bg-container p-1.5 shadow-menu"
					>
						{#each mailboxes as mailbox (mailbox.id)}
							<Menu.Item
								value={mailbox.id}
								onSelect={() => onSelectMailbox(mailbox.id)}
								class="flex cursor-default items-center justify-between gap-2 rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider"
							>
								<span class="truncate">{mailbox.name}</span>
								{#if mailbox.unread > 0}
									<span class="text-xs text-ink-secondary tabular-nums">{mailbox.unread}</span>
								{/if}
							</Menu.Item>
						{/each}
					</Menu.Content>
				</Menu.Positioner>
			</Portal>
		</Menu.Root>
	{/if}

	<div class="ml-auto flex min-w-0 flex-1 justify-end">
		<div class="relative w-full max-w-[380px] min-w-[180px] flex-1 basis-[180px]">
			<svg
				class="pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2 text-ink-secondary"
				viewBox="0 0 16 16"
				fill="none"
				aria-hidden="true"
			>
				<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
				<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
			<input
				bind:this={searchInput}
				type="search"
				placeholder="Search"
				aria-label="Search mail"
				class="h-8 w-full rounded-[8px] border border-line bg-container pl-8 pr-7 text-[13px] text-ink placeholder:text-ink-secondary focus:border-accent focus:outline-none"
			/>
			<kbd
				class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[11px] text-ink-tertiary"
				>/</kbd
			>
		</div>
	</div>

	<nav class="relative flex items-center gap-0.5" aria-label="Sections">
		<button
			bind:this={navButtons['mail']}
			type="button"
			class="relative h-8 rounded-[8px] px-2.5 text-[13px] font-medium text-accent transition-colors duration-[160ms] hover:bg-divider"
			aria-current="page"
		>
			Mail
		</button>
		{#each ['Calendar', 'Contacts', 'Settings'] as section (section)}
			<button
				type="button"
				class="h-8 rounded-[8px] px-2.5 text-[13px] text-ink-muted transition-colors duration-[160ms] hover:bg-divider"
				title={`${section} arrives in a later slice`}
			>
				{section}
			</button>
		{/each}
		{#if indicator.ready}
			<div
				class="absolute h-0.5 rounded-full bg-accent transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
				style:left="{indicator.left}px"
				style:width="{indicator.width}px"
				style:bottom="-9px"
				aria-hidden="true"
			></div>
		{/if}
	</nav>

	{#if account}
		<Menu.Root positioning={{ placement: 'bottom-end', gutter: 8, overflowPadding: 12 }} lazyMount unmountOnExit>
			<Menu.Trigger
				class="inline-flex h-8 items-center rounded-[8px] px-1 transition-colors duration-[160ms] hover:bg-divider"
				aria-label="Account"
			>
				<span
					class="flex size-[26px] items-center justify-center rounded-[8px] bg-accent-soft text-[11px] font-semibold text-accent"
				>
					{accountInitials}
				</span>
			</Menu.Trigger>
			<Portal>
				<Menu.Positioner>
					<Menu.Content class="z-40 w-60 rounded-[10px] border border-line bg-container p-1.5 shadow-menu">
						<div class="px-2.5 py-2">
							<div class="text-[13px] font-medium">{account.displayName ?? account.username}</div>
							<div class="text-xs text-ink-secondary">{account.username}</div>
						</div>
						<Menu.Item
							value="shortcuts"
							class="flex cursor-default items-center justify-between rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider"
							title="Arrives in a later slice"
						>
							<span>Keyboard shortcuts</span>
							<kbd class="font-mono text-[11px] text-ink-tertiary">?</kbd>
						</Menu.Item>
						<Menu.Item
							value="signout"
							class="flex cursor-default items-center rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider"
							title="Arrives with Mail 2.0's own login"
						>
							Sign out
						</Menu.Item>
					</Menu.Content>
				</Menu.Positioner>
			</Portal>
		</Menu.Root>
	{/if}
</header>
