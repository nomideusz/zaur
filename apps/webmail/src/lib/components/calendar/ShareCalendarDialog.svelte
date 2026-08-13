<script lang="ts">
import { errorMessage } from '@zaur/mail-core/utils/errors';
import { isJmapMethodError } from '@zaur/mail-core/jmap/errors';
import { Dialog } from '@ark-ui/svelte/dialog';
import { Portal } from '@ark-ui/svelte/portal';
import type { JMAPPrincipal } from '@zaur/mail-core/jmap/calendar-types';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import { shareRoleFromRights, calendarKey } from '$lib/jmap/calendar-rights';
import { auth } from '$lib/stores/auth.svelte';
import { calendar } from '$lib/stores/calendar.svelte';
import { toast } from '$lib/stores/toast.svelte';
import type { CalendarShareRole } from '$lib/types/calendar';
	import { cn } from '$lib/utils/cn';

	interface Props {
		open?: boolean;
		calendarId?: string | null;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), calendarId = null, onOpenChange }: Props = $props();

	const SHARE_ROLES = [
		{ value: 'read', label: 'Can view' },
		{ value: 'write', label: 'Can edit' }
	];

	let email = $state('');
	let role = $state<CalendarShareRole>('read');
	let submitting = $state(false);
	let loadingPeople = $state(false);
	let error = $state<string | null>(null);
	let principals = $state<Record<string, JMAPPrincipal>>({});

	const item = $derived(calendarId ? calendar.calendarById(calendarId) : undefined);
	const shareEntries = $derived.by(() => {
		if (!item?.shareWith) return [];
		return Object.entries(item.shareWith);
	});

	const dialogBtn =
		'inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:w-auto';

	$effect(() => {
		if (!open || !item?.shareWith || !auth.client) return;
		const ids = Object.keys(item.shareWith);
		if (!ids.length) return;
		void loadPrincipals(ids);
	});

	$effect(() => {
		if (open) {
			email = '';
			role = 'read';
			error = null;
			submitting = false;
		}
	});

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		onOpenChange?.(nextOpen);
	}

	function personLabel(principalId: string): string {
		const person = principals[principalId];
		if (!person) return principalId;
		if (person.name && person.email) return `${person.name} (${person.email})`;
		return person.name || person.email || principalId;
	}

	async function loadPrincipals(ids: string[]) {
		const client = auth.client;
		if (!client?.hasPrincipals()) return;
		loadingPeople = true;
		try {
			const list = await client.getPrincipals(ids);
			const next = { ...principals };
			for (const person of list) next[person.id] = person;
			principals = next;
		} catch {
			// Names stay as ids if directory lookup is disabled.
		} finally {
			loadingPeople = false;
		}
	}

	function lookupErrorMessage(err: unknown): string {
		if (isJmapMethodError(err, 'forbidden')) {
			return 'This server doesn’t allow looking up other accounts. Ask your admin to enable directory queries.';
		}
		return errorMessage(err, 'Could not look up that person');
	}

	async function addShare(event: Event) {
		event.preventDefault();
		const client = auth.client;
		const target = item;
		const query = email.trim();
		if (!client || !target || !query || submitting) return;

		submitting = true;
		error = null;
		try {
			if (!client.hasPrincipals()) {
				throw new Error('Sharing is not supported by this server.');
			}

			const matches = await client.queryPrincipals(query);
			const selfId = client.getCurrentUserPrincipalId();
			const candidates = matches.filter((person) => person.id !== selfId);
			const exact = candidates.find(
				(person) => person.email?.toLowerCase() === query.toLowerCase()
			);
			const person = exact ?? (candidates.length === 1 ? candidates[0] : undefined);

			if (!person) {
				error = candidates.length
					? 'Several accounts matched. Enter the exact email address.'
					: 'No account found for that address. Sharing only works with people on this server.';
				return;
			}

			await calendar.shareCalendar(client, calendarKey(target), person.id, role);
			principals = { ...principals, [person.id]: person };
			email = '';
			toast.show(`Shared “${target.name}” with ${person.name || person.email || 'them'}`, 'success');
		} catch (err) {
			error = lookupErrorMessage(err);
		} finally {
			submitting = false;
		}
	}

	async function changeRole(principalId: string, nextRole: CalendarShareRole) {
		const client = auth.client;
		const target = item;
		if (!client || !target) return;
		try {
			await calendar.shareCalendar(client, calendarKey(target), principalId, nextRole);
		} catch (err) {
			toast.show(errorMessage(err, 'Could not update sharing'), 'error');
		}
	}

	async function removeShare(principalId: string) {
		const client = auth.client;
		const target = item;
		if (!client || !target) return;
		try {
			await calendar.unshareCalendar(client, calendarKey(target), principalId);
			toast.show('Access removed', 'success');
		} catch (err) {
			toast.show(errorMessage(err, 'Could not update sharing'), 'error');
		}
	}
</script>

<Dialog.Root {open} onOpenChange={(details) => handleOpenChange(details.open)} role="dialog">
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
		<Dialog.Positioner class="fixed inset-0 z-[60] flex items-center justify-center p-4">
			<Dialog.Content
				class="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
			>
				<div class="flex flex-col gap-2">
					<Dialog.Title class="text-base font-semibold text-fg">
						Share {item ? `“${item.name}”` : 'calendar'}
					</Dialog.Title>
					<Dialog.Description class="text-sm text-fg-muted">
						People with an account on this mail server can view or edit this calendar.
					</Dialog.Description>
				</div>

				{#if shareEntries.length}
					<ul class="flex flex-col gap-2">
						{#each shareEntries as [principalId, rights] (principalId)}
							<li class="flex items-center gap-2">
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm text-fg">{personLabel(principalId)}</p>
									{#if loadingPeople && !principals[principalId]}
										<p class="text-xs text-fg-subtle">Loading…</p>
									{/if}
								</div>
								<SettingsSelect
									label="Access for {personLabel(principalId)}"
									value={shareRoleFromRights(rights)}
									options={SHARE_ROLES}
									class="w-28"
									onchange={(value) => changeRole(principalId, value as CalendarShareRole)}
								/>
								<button
									type="button"
									class="z-mail-text-nav__link--danger shrink-0 text-xs"
									onclick={() => void removeShare(principalId)}
								>
									Remove
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-fg-muted">Not shared with anyone yet.</p>
				{/if}

				<form class="flex flex-col gap-3" onsubmit={addShare}>
					<label class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-fg-muted">Email</span>
						<input
							type="email"
							class="z-input"
							bind:value={email}
							placeholder="colleague@zaur.app"
							autocomplete="off"
							disabled={submitting}
						/>
					</label>
					<SettingsSelect
						label="Access"
						value={role}
						options={SHARE_ROLES}
						onchange={(value) => (role = value as CalendarShareRole)}
					/>
					{#if error}
						<p class="text-sm text-danger" role="alert">{error}</p>
					{/if}
					<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Dialog.CloseTrigger
							type="button"
							class={cn(
								dialogBtn,
								'border border-border bg-surface text-fg hover:bg-surface-sunken focus-visible:outline-accent'
							)}
							disabled={submitting}
						>
							Done
						</Dialog.CloseTrigger>
						<button
							type="submit"
							class={cn(
								dialogBtn,
								'bg-accent text-accent-fg shadow-sm hover:bg-accent-hover focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50'
							)}
							disabled={submitting || !email.trim()}
						>
							{submitting ? 'Sharing…' : 'Share'}
						</button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
