<script lang="ts">
	import {
		emptyRule,
		ruleProblems,
		type MailRule,
		type RuleAction,
		type RuleCondition,
		type RuleField,
		type RuleFlag,
		type RuleOperator
	} from '@zaur/mail-core';
	import type { MailboxDTO } from '#lib/mail/types';
	import ActionIcon from '#lib/components/mail/ActionIcon.svelte';

	interface Props {
		/** Server-side state; `undefined` while it loads. `state` itself is a rune. */
		data:
			| {
					supported: boolean;
					rules: MailRule[];
					managed: boolean;
					foreignScript: string | null;
			  }
			| undefined;
		error: unknown;
		mailboxes: MailboxDTO[] | undefined;
		saving: boolean;
		onSave: (rules: MailRule[], takeOver: boolean) => void;
	}

	let { data, error, mailboxes, saving, onSave }: Props = $props();

	/**
	 * The editor owns a working copy. Rules are a list you rearrange and half
	 * finish, so saving is deliberate rather than per-keystroke — and a keystroke
	 * here is an `Email/set` on everything that arrives from now on.
	 */
	let draft = $state<MailRule[]>([]);
	let loadedFrom = $state<string | null>(null);

	$effect(() => {
		if (!data) return;
		// Re-seed only when the server's copy actually changes, or typing would
		// be thrown away by every refresh.
		const key = JSON.stringify(data.rules);
		if (key === loadedFrom) return;
		loadedFrom = key;
		draft = structuredClone($state.snapshot(data.rules));
	});

	const dirty = $derived(loadedFrom !== null && JSON.stringify(draft) !== loadedFrom);
	const problems = $derived(draft.flatMap((rule) => ruleProblems(rule)));
	/** Incomplete rules are kept but not compiled, so they must not block a save. */
	const blocked = $derived(draft.some((rule) => !rule.name.trim()));

	const FIELDS: { value: RuleField; label: string }[] = [
		{ value: 'from', label: 'From' },
		{ value: 'to', label: 'To' },
		{ value: 'cc', label: 'Cc' },
		{ value: 'subject', label: 'Subject' }
	];
	const OPERATORS: { value: RuleOperator; label: string }[] = [
		{ value: 'contains', label: 'contains' },
		{ value: 'is', label: 'is exactly' },
		{ value: 'startsWith', label: 'starts with' },
		{ value: 'endsWith', label: 'ends with' }
	];
	const FLAGS: { value: RuleFlag; label: string }[] = [
		{ value: '$important', label: 'Highlight' },
		{ value: '\\Flagged', label: 'Flag' },
		{ value: '\\Seen', label: 'Mark as read' }
	];

	/** Drafts is not a destination for incoming mail. */
	const fileTargets = $derived((mailboxes ?? []).filter((box) => box.kind !== 'drafts'));

	function addRule() {
		draft = [...draft, emptyRule(`r${Date.now().toString(36)}`)];
	}

	function removeRule(id: string) {
		draft = draft.filter((rule) => rule.id !== id);
	}

	function move(id: string, delta: number) {
		const index = draft.findIndex((rule) => rule.id === id);
		const next = index + delta;
		if (index < 0 || next < 0 || next >= draft.length) return;
		const copy = [...draft];
		[copy[index], copy[next]] = [copy[next]!, copy[index]!];
		draft = copy;
	}

	function patch(id: string, change: Partial<MailRule>) {
		draft = draft.map((rule) => (rule.id === id ? { ...rule, ...change } : rule));
	}

	function setCondition(id: string, index: number, change: Partial<RuleCondition>) {
		patch(id, {
			conditions: draft
				.find((rule) => rule.id === id)!
				.conditions.map((condition, i) => (i === index ? { ...condition, ...change } : condition))
		});
	}

	function setAction(id: string, index: number, action: RuleAction) {
		patch(id, {
			actions: draft.find((rule) => rule.id === id)!.actions.map((a, i) => (i === index ? action : a))
		});
	}

	function actionFor(kind: string, previous: RuleAction | undefined): RuleAction {
		if (kind === 'fileInto') {
			return { type: 'fileInto', mailbox: fileTargets[0]?.name ?? '' };
		}
		if (kind === 'discard') return { type: 'discard' };
		return {
			type: 'addFlag',
			flag: previous?.type === 'addFlag' ? previous.flag : '$important'
		};
	}
</script>

<section class="rounded-[10px] border border-[#e2e8f0] bg-white p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4">
	<h2 class="z-caption">Rules</h2>
	<p class="mt-[7px] text-[12.5px] leading-[1.6] text-[#475569]">
		These run on the server, so they apply to mail as it arrives — on every device, and whether
		or not this one is open.
	</p>

	{#if error}
		<p class="mt-3 text-[13px] text-[#b91c1c]">Could not load your rules.</p>
	{:else if !data}
		<p class="mt-3 text-[13px] text-[#94a3b8]">Loading…</p>
	{:else if !data.supported}
		<p class="mt-3 text-[13px] leading-relaxed text-[#64748b]">
			This mail server does not offer server-side rules
			(<span class="font-mono text-[12px]">urn:ietf:params:jmap:sieve</span>).
		</p>
	{:else if !data.managed}
		<!--
			Someone's hand-written Sieve is not ours to silently replace, so the
			editor stays shut until they say so.
		-->
		<div class="z-railed mt-3 rounded-[10px] border border-[#d97706] bg-[#fde68a] py-2.5 pr-3 pl-[18px]" style="--z-rail:#d97706;--z-rail-inset:10px">
			<p class="text-[13px] font-semibold text-[#78350f]">
				This account already has a filtering script
			</p>
			<p class="mt-1 text-[12.5px] leading-relaxed text-[#78350f]">
				It was not written here, so it cannot be edited as rules without replacing it.
			</p>
			<pre class="mt-2.5 max-h-40 overflow-auto rounded-[6px] border border-[#d97706]/40 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-[#334155]">{data.foreignScript ??
					''}</pre>
			<button
				type="button"
				class="btn-tactile mt-2.5 !h-7 !border-[#d97706] !text-[12px] !font-semibold !text-[#78350f]"
				disabled={saving}
				onclick={() => onSave([], true)}
			>
				Take over
			</button>
		</div>
	{:else}
		<div class="mt-4 flex flex-col gap-2.5">
			{#each draft as rule, index (rule.id)}
				<div class="rounded-[10px] border border-[#e2e8f0] p-3 {rule.enabled ? 'bg-white' : 'bg-[#f8fafc]'}">
					<div class="flex items-center gap-2.5">
						<input
							type="checkbox"
							class="z-check"
							checked={rule.enabled}
							aria-label={rule.enabled ? 'Disable this rule' : 'Enable this rule'}
							onchange={(event) => patch(rule.id, { enabled: event.currentTarget.checked })}
						/>
						<input
							type="text"
							class="z-field min-w-0 flex-1 max-md:text-base"
							placeholder="Name this rule"
							value={rule.name}
							oninput={(event) => patch(rule.id, { name: event.currentTarget.value })}
						/>
						<!-- Order is meaning: a rule that stops ends the ones below it. -->
						<button
							type="button"
							class="z-icon-btn shrink-0 disabled:!opacity-30"
							aria-label="Move up"
							disabled={index === 0}
							onclick={() => move(rule.id, -1)}
						>
							<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						<button
							type="button"
							class="z-icon-btn shrink-0 disabled:!opacity-30"
							aria-label="Move down"
							disabled={index === draft.length - 1}
							onclick={() => move(rule.id, 1)}
						>
							<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						<button
							type="button"
							class="z-icon-btn shrink-0 hover:!bg-[#fef2f2] hover:!text-[#dc2626]"
							aria-label="Delete this rule"
							onclick={() => removeRule(rule.id)}
						>
							<ActionIcon name="trash" />
						</button>
					</div>

					<!-- Conditions -->
					<div class="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-[#64748b]">
						<span>If</span>
						<select
							class="z-field"
							aria-label="Match all or any condition"
							value={rule.match}
							onchange={(event) =>
								patch(rule.id, { match: event.currentTarget.value as 'all' | 'any' })}
						>
							<option value="all">all</option>
							<option value="any">any</option>
						</select>
						<span>of these match</span>
					</div>

					<div class="mt-2 flex flex-col gap-2">
						{#each rule.conditions as condition, conditionIndex (conditionIndex)}
							<div class="flex flex-wrap items-center gap-2">
								<select
									class="z-field"
									aria-label="Field"
									value={condition.field}
									onchange={(event) =>
										setCondition(rule.id, conditionIndex, {
											field: event.currentTarget.value as RuleField
										})}
								>
									{#each FIELDS as field (field.value)}
										<option value={field.value}>{field.label}</option>
									{/each}
								</select>
								<select
									class="z-field"
									aria-label="Comparison"
									value={condition.operator}
									onchange={(event) =>
										setCondition(rule.id, conditionIndex, {
											operator: event.currentTarget.value as RuleOperator
										})}
								>
									{#each OPERATORS as operator (operator.value)}
										<option value={operator.value}>{operator.label}</option>
									{/each}
								</select>
								<input
									type="text"
									class="z-field min-w-0 flex-1 max-md:text-base"
									placeholder="…"
									value={condition.value}
									oninput={(event) =>
										setCondition(rule.id, conditionIndex, { value: event.currentTarget.value })}
								/>
								{#if rule.conditions.length > 1}
									<button
										type="button"
										class="z-icon-btn shrink-0"
										aria-label="Remove this condition"
										onclick={() =>
											patch(rule.id, {
												conditions: rule.conditions.filter((_: RuleCondition, i: number) => i !== conditionIndex)
											})}
									>
										<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
											<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
										</svg>
									</button>
								{/if}
							</div>
						{/each}
						<button
							type="button"
							class="btn-tactile !h-[26px] !px-2 !text-[12px] self-start"
							onclick={() =>
								patch(rule.id, {
									conditions: [
										...rule.conditions,
										{ field: 'from', operator: 'contains', value: '' }
									]
								})}
						>
							Add condition
						</button>
					</div>

					<!-- Actions -->
					<div class="z-caption mt-3.5">Then</div>
					<div class="mt-2 flex flex-col gap-2">
						{#each rule.actions as action, actionIndex (actionIndex)}
							<div class="flex flex-wrap items-center gap-2">
								<select
									class="z-field"
									aria-label="Action"
									value={action.type}
									onchange={(event) =>
										setAction(rule.id, actionIndex, actionFor(event.currentTarget.value, action))}
								>
									<option value="fileInto">Move to</option>
									<option value="addFlag">Mark</option>
									<option value="discard">Delete</option>
								</select>

								{#if action.type === 'fileInto'}
									<select
										class="z-field min-w-0 flex-1"
										aria-label="Folder"
										value={action.mailbox}
										onchange={(event) =>
											setAction(rule.id, actionIndex, {
												type: 'fileInto',
												mailbox: event.currentTarget.value
											})}
									>
										{#each fileTargets as target (target.id)}
											<option value={target.name}>{target.name}</option>
										{/each}
									</select>
								{:else if action.type === 'addFlag'}
									<select
										class="z-field min-w-0 flex-1"
										aria-label="Mark as"
										value={action.flag}
										onchange={(event) =>
											setAction(rule.id, actionIndex, {
												type: 'addFlag',
												flag: event.currentTarget.value as RuleFlag
											})}
									>
										{#each FLAGS as flag (flag.value)}
											<option value={flag.value}>{flag.label}</option>
										{/each}
									</select>
								{:else}
									<span class="flex-1 text-[12.5px] text-[#64748b]">
										The message is dropped before it arrives.
									</span>
								{/if}

								<button
									type="button"
									class="z-icon-btn shrink-0"
									aria-label="Remove this action"
									onclick={() =>
										patch(rule.id, { actions: rule.actions.filter((_: RuleAction, i: number) => i !== actionIndex) })}
								>
									<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
										<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
									</svg>
								</button>
							</div>
						{/each}
						<button
							type="button"
							class="btn-tactile !h-[26px] !px-2 !text-[12px] self-start"
							onclick={() =>
								patch(rule.id, {
									actions: [...rule.actions, actionFor('fileInto', undefined)]
								})}
						>
							Add action
						</button>
					</div>

					<label class="mt-3.5 flex cursor-pointer items-center gap-2.5 text-[13px] text-[#334155]">
						<input
							type="checkbox"
							class="z-check"
							checked={rule.stop}
							onchange={(event) => patch(rule.id, { stop: event.currentTarget.checked })}
						/>
						Stop checking later rules when this one matches
					</label>

					{#if ruleProblems(rule).length > 0}
						<ul class="mt-2.5 flex flex-col gap-1">
							{#each ruleProblems(rule) as problem (problem)}
								<li class="text-[12.5px] text-[#78350f]">{problem}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}

			{#if draft.length === 0}
				<p class="text-[13px] leading-relaxed text-[#64748b]">
					No rules yet. A rule looks at mail as it arrives and can file it, mark it, or drop it.
				</p>
			{/if}
		</div>

		<div class="mt-4 flex flex-wrap items-center gap-2">
			<button type="button" class="btn-tactile" onclick={addRule}>Add rule</button>
			<button
				type="button"
				class="btn-tactile font-semibold {dirty && !blocked
					? 'btn-primary'
					: '!border-[#e2e8f0] !bg-[#f1f5f9] !text-[#94a3b8]'}"
				disabled={!dirty || blocked || saving}
				onclick={() => onSave($state.snapshot(draft), false)}
			>
				{saving ? 'Saving…' : 'Save rules'}
			</button>
			{#if problems.length > 0}
				<!-- Unfinished rules are kept, just not compiled — say so rather than
				     letting them look saved and working. -->
				<span class="text-[12.5px] text-[#78350f]">
					Rules that are not finished are saved but will not run.
				</span>
			{/if}
		</div>
	{/if}
</section>
