<script lang="ts">
	import { messageOf } from '#lib/errors';
	import RulesEditor from '#lib/components/settings/RulesEditor.svelte';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import { prefs, setPref } from '#lib/settings.svelte.ts';
	import { CATEGORIES, type MailRule } from '@zaur/mail-core';
	import { whoami } from '../../../session.remote';
	import { mailboxes } from '../../../mail.remote';
	import { rules as rulesQuery, saveRules } from '../../../rules.remote';
	import { aiCategoriesOffered, recheckOtherCategories } from '../../../settings.remote';

	const who = whoami();
	const rulesResource = $derived(who.current ? rulesQuery() : undefined);
	const mailboxesResource = $derived(who.current ? mailboxes() : undefined);
	const aiOffered = $derived(who.current ? aiCategoriesOffered() : undefined);

	let status = $state<{ text: string; error?: boolean } | null>(null);
	let saving = $state(false);
	let rechecking = $state(false);

	async function persist(next: MailRule[], takeOver: boolean) {
		saving = true;
		status = null;
		try {
			const { count } = await saveRules({ rules: next, takeOver });
			await rulesResource?.refresh();
			status = { text: count === 1 ? '1 rule active' : `${count} rules active` };
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not save the rules'), error: true };
		} finally {
			saving = false;
		}
	}

	async function recheck() {
		rechecking = true;
		status = null;
		try {
			const { queued } = await recheckOtherCategories();
			status = {
				text:
					queued === 0
						? 'Nothing is marked Other right now'
						: `Re-checking ${queued} ${queued === 1 ? 'message' : 'messages'} marked Other — labels update as they land`
			};
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not re-check'), error: true };
		} finally {
			rechecking = false;
		}
	}
</script>

<StatusNote {status} />

<RulesEditor
	data={rulesResource?.current}
	error={rulesResource?.error}
	mailboxes={mailboxesResource?.current}
	{saving}
	onSave={(next, takeOver) => void persist(next, takeOver)}
/>

<section class="z-card">
	<h2 class="z-card-head">Categories</h2>
	<div class="z-card-body">
		<p class="text-[12.5px] leading-[1.6] text-[var(--z-muted)]">
			A category names what a message is — it shows as a chip in the list and as a filter. A rule with
			<em>Categorise as</em> sets one on delivery; the AI only looks at mail no rule has categorised, so your rules
			always win.
		</p>
		<dl class="mt-3.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
			{#each CATEGORIES as category (category.id)}
				<dt class="font-medium text-[var(--z-body)]">{category.label}</dt>
				<dd class="text-[var(--z-muted)]">{category.hint}</dd>
			{/each}
		</dl>
	</div>
	{#if aiOffered?.current}
		<label class="z-card-foot cursor-pointer !flex-nowrap justify-between gap-4 !py-2.5">
			<span>
				<span class="block text-[13px] font-medium text-[var(--z-body)]">Categorise the rest with AI</span>
				<span class="block">Sends sender, subject, list headers and the start of the text of uncategorised mail to TypeSafe. Off by default.</span>
			</span>
			<input type="checkbox" class="z-check" checked={prefs.aiCategories} onchange={(event) => setPref('aiCategories', event.currentTarget.checked)} />
		</label>
		{#if prefs.aiCategories}
			<!-- "Other" is final, so this is the one way better criteria reach old mail. -->
			<div class="z-card-foot justify-between gap-4">
				<span>Mail the AI could not place is marked Other and not looked at again.</span>
				<button type="button" class="btn-tactile !h-7 shrink-0 !px-2.5 !text-[12px]" disabled={rechecking} onclick={() => void recheck()}>
					{rechecking ? 'Queueing…' : 'Re-check Other'}
				</button>
			</div>
		{/if}
	{/if}
</section>
