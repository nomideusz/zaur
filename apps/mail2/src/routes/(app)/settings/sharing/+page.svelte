<script lang="ts">
	import { messageOf } from '#lib/errors';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import { whoami } from '../../../session.remote';
	import { mailboxSharing, shareMailbox, unshareMailbox, type MailboxShareDTO } from '../../../mail.remote';

	const who = whoami();
	const sharingResource = $derived(who.current ? mailboxSharing() : undefined);

	let status = $state<{ text: string; error?: boolean } | null>(null);
	let shareTo = $state('');
	let busy = $state(false);

	async function share() {
		busy = true;
		status = null;
		try {
			const { name } = await shareMailbox({ email: shareTo });
			shareTo = '';
			status = { text: `Shared with ${name}` };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not share the mailbox'), error: true };
		} finally {
			busy = false;
		}
	}

	async function unshare(person: MailboxShareDTO) {
		if (!confirm(`Stop sharing this mailbox with ${person.email || person.name || 'them'}?`)) return;
		busy = true;
		status = null;
		try {
			await unshareMailbox({ principalId: person.id });
			status = { text: 'No longer shared' };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not stop sharing'), error: true };
		} finally {
			busy = false;
		}
	}
</script>

<StatusNote {status} />

<section class="z-card">
	<div class="z-card-head flex-wrap !py-2.5">
		<input
			type="email"
			bind:value={shareTo}
			placeholder="Their address, on any domain here"
			aria-label="Share with"
			autocomplete="off"
			class="z-field min-w-0 flex-1 basis-[200px] !h-[30px] max-md:text-base"
			onkeydown={(event) => {
				if (event.key === 'Enter' && shareTo.trim()) void share();
			}}
		/>
		<button type="button" class="btn-tactile !h-[30px] {shareTo.trim() ? 'btn-primary' : ''}" disabled={busy || !shareTo.trim()} onclick={share}>
			Share
		</button>
	</div>

	{#if sharingResource?.error}
		<p class="z-card-body text-[13px] text-[var(--z-ch-discard-ink)]">Could not load who this mailbox is shared with.</p>
	{:else if !sharingResource?.current}
		<div class="z-card-body z-skeleton h-[60px]" aria-hidden="true"></div>
	{:else}
		<ul class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]" role="list">
			{#each sharingResource.current as person (person.id)}
				<li class="flex items-center justify-between gap-3 px-4 py-2.5">
					<span class="min-w-0">
						<span class="block truncate text-[13.5px] font-medium text-[var(--z-body)]">{person.name || person.email || person.id}</span>
						{#if person.name && person.email && person.name !== person.email}
							<span class="z-mono block truncate text-[11px] text-[var(--z-soft)]">{person.email}</span>
						{/if}
					</span>
					<button type="button" class="btn-tactile !h-7 shrink-0 !text-[12px]" disabled={busy} onclick={() => void unshare(person)}>
						Stop sharing
					</button>
				</li>
			{:else}
				<li class="px-4 py-3 text-[12.5px] text-[var(--z-muted)]">Not shared with anyone.</li>
			{/each}
		</ul>
	{/if}

	<p class="z-card-foot">
		They can read, file, flag and delete its mail; what they write goes from their own address. Folders you add later
		join when you share again.
	</p>
</section>
