<script lang="ts">
	/**
	 * Dev-only fixture for the phone bulk-select dock.
	 *
	 * Mounts the real MessageList (which owns MessageListBulkActionBar), so the
	 * dock under review is the production component — only the surrounding
	 * controls are fixtures.
	 *
	 * The dock's phone layout is a viewport media query, so on a desktop browser
	 * "Force phone layout" pins it on inside the 390px frame. Uncheck it to see
	 * the old wrapping pill for comparison.
	 *
	 * Not mounted here: the mobile top bar's "Select" button (it lives in the app
	 * shell and needs a real route). "Enter select mode" calls the same
	 * mail.enterSelectMode() the button calls.
	 */
	import { onMount } from 'svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import type { Mailbox, MessagePreview } from '$lib/types/mail';

	const msg = (n: number, over: Partial<MessagePreview> = {}): MessagePreview => ({
		id: `m${n}`,
		threadId: `t${n}`,
		mailboxId: 'inbox',
		from: { name: `Sender ${n}`, email: `sender${n}@example.com` },
		subject: `Subject ${n}`,
		preview: '',
		receivedAt: new Date(Date.UTC(2026, 5, n, 9, 30)).toISOString(),
		unread: false,
		starred: false,
		important: false,
		hasAttachment: false,
		...over
	});

	/* Mixed read/unread + important/not-important so every dock action appears at
	   once — the worst case for the action row's width. */
	const messages: MessagePreview[] = [
		msg(1, { subject: 'Read, normal' }),
		msg(2, { subject: 'Read, highlighted', important: true }),
		msg(3, { subject: 'Unread, highlighted, attachment', unread: true, important: true, hasAttachment: true }),
		msg(4, { subject: 'Unread, normal', unread: true }),
		msg(5, {
			subject: 'Unread with a subject long enough to clamp on a phone',
			unread: true,
			hasAttachment: true,
			replied: true
		})
	];

	/* A custom folder is required for the "More" (move) menu: moveTargetMailboxes
	   excludes every system role, so with only system folders there is nothing to
	   move to and the overflow button is correctly absent. */
	const labMailboxes: Mailbox[] = [
		{ id: 'inbox', jmapId: 'jmap-inbox', name: 'Inbox', role: 'inbox', unread: 3, total: 5 },
		{ id: 'archive', jmapId: 'jmap-archive', name: 'Archive', role: 'archive', unread: 0, total: 0 },
		{ id: 'junk', jmapId: 'jmap-junk', name: 'Spam', role: 'junk', unread: 0, total: 0 },
		{ id: 'trash', jmapId: 'jmap-trash', name: 'Trash', role: 'trash', unread: 0, total: 0 },
		{ id: 'projects', jmapId: 'jmap-projects', name: 'Projects', role: 'custom', unread: 0, total: 0 }
	];

	const folders = [
		{ id: 'inbox', label: 'Inbox' },
		{ id: 'archive', label: 'Archive' },
		{ id: 'junk', label: 'Spam' },
		{ id: 'trash', label: 'Trash' },
		{ id: 'projects', label: 'Projects' }
	];

	let routeId = $state('inbox');
	let forcePhone = $state(true);

	const selectedCount = $derived(mail.selectedMessageIds.size);

	onMount(() => {
		mail.mailboxes = labMailboxes;
		mail.currentMailboxRouteId = routeId;
		return () => {
			mail.mailboxes = [];
			mail.currentMailboxRouteId = null;
			mail.exitSelectMode();
		};
	});

	$effect(() => {
		mail.currentMailboxRouteId = routeId;
	});

	function pickFolder(id: string) {
		routeId = id;
		mail.deselectAll();
	}
</script>

<svelte:head>
	<title>bulk-dock-lab</title>
</svelte:head>

<div class="lab-page">
	<div class="lab-controls">
		<div class="lab-row">
			<button
				type="button"
				data-testid="enter-select-mode"
				class="lab-btn"
				disabled={mail.selectMode}
				onclick={() => mail.enterSelectMode()}
			>
				Enter select mode
			</button>
			<button
				type="button"
				data-testid="exit-select-mode"
				class="lab-btn"
				disabled={!mail.selectMode && !mail.hasSelection}
				onclick={() => mail.exitSelectMode()}
			>
				Exit
			</button>
			<button
				type="button"
				data-testid="toggle-selection"
				class="lab-btn"
				onclick={() => (mail.hasSelection ? mail.deselectAll() : mail.startSelection('m5'))}
			>
				Toggle selection
			</button>
			<button
				type="button"
				data-testid="select-all"
				class="lab-btn"
				onclick={() => mail.selectMessagesByFilter('all')}
			>
				Select all
			</button>
			<button
				type="button"
				data-testid="clear-all"
				class="lab-btn"
				onclick={() => mail.deselectAll()}
			>
				Clear all
			</button>
		</div>

		<div class="lab-row">
			<span class="lab-label">Folder</span>
			{#each folders as folder (folder.id)}
				<button
					type="button"
					class="lab-btn lab-btn--toggle"
					class:lab-btn--on={routeId === folder.id}
					data-testid={`folder-${folder.id}`}
					onclick={() => pickFolder(folder.id)}
				>
					{folder.label}
				</button>
			{/each}
		</div>

		<div class="lab-row">
			<label class="lab-check">
				<input type="checkbox" bind:checked={forcePhone} data-testid="force-phone" />
				Force phone layout
			</label>
			<span class="lab-status" data-testid="status">
				selectMode={mail.selectMode} · selected={selectedCount} · dock={mail.selectMode ||
				mail.hasSelection
					? 'open'
					: 'closed'}
			</span>
		</div>

		<p class="lab-note">
			Actions are live — Trash/Mark spam will try to reach a JMAP server and fail with a toast.
			That is expected here; this fixture has no client.
		</p>
	</div>

	<div class="lab-frame" class:lab-frame--phone={forcePhone}>
		<MessageList {messages} mailboxName="Inbox" mailboxRouteId={routeId} />
	</div>
</div>

<style>
	.lab-page {
		display: flex;
		min-height: 100dvh;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem;
		background-color: var(--z-surface-sunken);
	}

	.lab-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.lab-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.lab-btn {
		min-height: 2rem;
		padding-inline: 0.625rem;
		border: 1px solid var(--z-border);
		border-radius: 9999px;
		background-color: var(--z-surface-raised);
		font-size: 0.8125rem;
		color: var(--z-fg);
		cursor: pointer;
	}

	.lab-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.lab-btn--on {
		border-color: var(--z-accent);
		background-color: color-mix(in srgb, var(--z-accent) 12%, transparent);
		color: var(--z-accent);
	}

	.lab-label,
	.lab-status {
		font-size: 0.75rem;
		color: var(--z-fg-muted);
	}

	.lab-status {
		font-variant-numeric: tabular-nums;
	}

	.lab-check {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--z-fg);
	}

	.lab-note {
		max-width: 46rem;
		font-size: 0.75rem;
		color: var(--z-fg-muted);
	}

	/* 390×844 — iPhone 14 / 15 logical viewport. */
	.lab-frame {
		display: flex;
		width: 390px;
		max-width: 100%;
		height: min(844px, calc(100dvh - 12rem));
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--z-border-strong);
		border-radius: 1.25rem;
		background-color: var(--z-surface);
	}

	/*
	 * The dock's phone layout is a viewport media query, so a narrow frame on a
	 * wide screen still renders the desktop pill. These overrides pin the phone
	 * layout on for review; they mirror the max-width:767px block in
	 * primitives.css and exist only in this dev fixture.
	 */
	.lab-frame--phone :global(.z-bulk-dock__inline) {
		display: none !important;
	}

	.lab-frame--phone :global(.z-bulk-dock__phone) {
		display: flex !important;
	}

	.lab-frame--phone :global(.z-action-bar-content--dock) {
		width: 100%;
		max-width: 100%;
		flex-direction: column;
		align-items: stretch;
		gap: 0.25rem;
		border-radius: 1rem;
	}

	.lab-frame--phone :global(.z-action-bar-positioner--inline) {
		padding-inline: 0.5rem;
	}
</style>
