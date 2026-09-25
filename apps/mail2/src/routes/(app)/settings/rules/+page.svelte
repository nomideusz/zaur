<script lang="ts">
	import { messageOf } from '#lib/errors';
	import RulesEditor from '#lib/components/settings/RulesEditor.svelte';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import { AI_CONFIDENCES, prefs, setPref, type AiConfidence } from '#lib/settings.svelte.ts';
	import { CATEGORIES, type MailRule } from '@zaur/mail-core';
	import { whoami } from '../../../session.remote';
	import { mailboxes } from '../../../mail.remote';
	import { rules as rulesQuery, saveRules } from '../../../rules.remote';
	import { aiCategoriesOffered, recheckOtherCategories } from '../../../settings.remote';

	const who = whoami();
	const rulesResource = $derived(who.current ? rulesQuery() : undefined);
	const mailboxesResource = $derived(who.current ? mailboxes() : undefined);
	const aiOffered = $derived(who.current ? aiCategoriesOffered() : undefined);

	const confidence: Record<AiConfidence, { label: string; hint: string }> = {
		cautious: { label: 'Cautious', hint: 'Labels only what it is sure of; more ends up as Other.' },
		balanced: { label: 'Balanced', hint: 'Labels what it is fairly sure of.' },
		eager: { label: 'Eager', hint: 'Labels nearly everything, and is wrong more often.' }
	};

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
			<div class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]">
				<div class="flex items-center justify-between gap-4 px-4 py-3 max-md:flex-wrap">
					<span class="min-w-0">
						<span class="block text-[13.5px] font-medium text-[var(--z-body)]">How sure it must be</span>
						<span class="mt-[1px] block text-[12px] leading-[1.4] text-[var(--z-soft)]">{confidence[prefs.aiConfidence].hint}</span>
					</span>
					<div class="z-group" role="group" aria-label="How sure the AI must be">
						{#each AI_CONFIDENCES as level (level)}
							<button type="button" class="z-segment !h-[28px] !px-[10px] !text-[12px]" aria-pressed={prefs.aiConfidence === level} onclick={() => setPref('aiConfidence', level)}>
								{confidence[level].label}
							</button>
						{/each}
					</div>
				</div>
				<label class="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
					<span class="min-w-0">
						<span class="block text-[13.5px] font-medium text-[var(--z-body)]">Send headers only</span>
						<span class="mt-[1px] block text-[12px] leading-[1.4] text-[var(--z-soft)]">Sender, subject and list headers — none of the text. Weaker at telling a receipt from a transaction.</span>
					</span>
					<input type="checkbox" class="z-check" checked={prefs.aiHeadersOnly} onchange={(event) => setPref('aiHeadersOnly', event.currentTarget.checked)} />
				</label>
				<label class="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
					<span class="min-w-0">
						<span class="block text-[13.5px] font-medium text-[var(--z-body)]">Archive newsletters</span>
						<span class="mt-[1px] block text-[12px] leading-[1.4] text-[var(--z-soft)]">Move what it calls a newsletter out of the inbox. They stay unread under Newsletters; notifications like sign-in codes stay put.</span>
					</span>
					<input type="checkbox" class="z-check" checked={prefs.aiArchiveNewsletters} onchange={(event) => setPref('aiArchiveNewsletters', event.currentTarget.checked)} />
				</label>
			</div>
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
