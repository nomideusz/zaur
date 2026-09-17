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
	import { CHANNELS, channelStyle, mailboxChannel, type Channel } from '#lib/mail/colors';

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
	/**
	 * Rules read as cards; one at a time opens into the editor. Most of the time
	 * nobody is editing, and a card of chips is scannable in a way a row of
	 * selects never is.
	 */
	let editingId = $state<string | null>(null);

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
		{ value: '$important', label: 'Important' },
		{ value: '\\Flagged', label: 'Flag' },
		{ value: '\\Seen', label: 'Mark as read' }
	];
	const operatorLabel = (value: RuleOperator) =>
		OPERATORS.find((operator) => operator.value === value)?.label ?? value;
	const flagLabel = (value: string) => FLAGS.find((flag) => flag.value === value)?.label ?? value;

	/** Drafts is not a destination for incoming mail. */
	const fileTargets = $derived((mailboxes ?? []).filter((box) => box.kind !== 'drafts'));

	/**
	 * An action's channel: filing takes the folder's, a flag takes what the flag
	 * means (needs you, flagged, confirmed), discard is discard. The same
	 * function the list uses, so a rule that files into Junk is red here and
	 * red there.
	 */
	function actionChannel(action: RuleAction): Channel {
		if (action.type === 'discard') return CHANNELS.discard;
		if (action.type === 'addFlag') {
			if (action.flag === '$important') return CHANNELS.needs;
			if (action.flag === '\\Flagged') return CHANNELS.flagged;
			return CHANNELS.confirmed;
		}
		const target = (mailboxes ?? []).find((box) => box.name === action.mailbox);
		return mailboxChannel(target?.kind);
	}

	function actionLabel(action: RuleAction): string {
		if (action.type === 'discard') return 'Discard';
		if (action.type === 'addFlag') return flagLabel(action.flag);
		return `File into ${action.mailbox || '…'}`;
	}

	function addRule() {
		const rule = emptyRule(`r${Date.now().toString(36)}`);
		draft = [...draft, rule];
		editingId = rule.id;
	}

	/**
	 * The one rule almost everyone wants: newsletters and notifications out of
	 * the inbox and into a folder the list colours as a digest. It files into
	 * a folder called Digests or Newsletters if there is one, else Archive —
	 * and opens in the editor so the folder can be changed before saving.
	 */
	function addNewslettersRule() {
		const target =
			fileTargets.find((box) => /^(digests?|newsletters?)$/i.test(box.name)) ??
			fileTargets.find((box) => box.kind === 'archive') ??
			fileTargets[0];
		const rule: MailRule = {
			...emptyRule(`r${Date.now().toString(36)}`),
			name: 'Newsletters',
			match: 'any',
			conditions: [
				{ field: 'from', operator: 'contains', value: 'newsletter' },
				{ field: 'from', operator: 'contains', value: 'noreply' },
				{ field: 'subject', operator: 'contains', value: 'unsubscribe' }
			],
			actions: [
				{ type: 'addFlag', flag: '\\Seen' },
				{ type: 'fileInto', mailbox: target?.name ?? 'Archive' }
			],
			stop: true
		};
		draft = [...draft, rule];
		editingId = rule.id;
	}

	function removeRule(id: string) {
		draft = draft.filter((rule) => rule.id !== id);
		if (editingId === id) editingId = null;
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

	const card = 'rounded-[10px] border border-[var(--z-hairline)] p-3';
	const chip = 'z-chip !normal-case !tracking-normal !text-[10.5px]';
</script>

<section class="rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-surface)] p-[18px] shadow-[var(--z-shadow-tactile)] max-md:p-4">
	<h2 class="z-caption">Rules</h2>
	<p class="mt-[7px] text-[12.5px] leading-[1.6] text-[var(--z-muted)]">
		Rules compile to one Sieve script the server runs on delivery, so they apply on every
		device, whether or not this one is open. A rule is conditions matched <em>all</em> or
		<em>any</em>, then actions: file into a folder, mark, or discard — and optionally stop
		testing the rest.
	</p>

	{#if error}
		<p class="mt-3 text-[13px] text-[var(--z-ch-discard-ink)]">Could not load your rules.</p>
	{:else if !data}
		<div class="z-skeleton mt-3 h-[72px] rounded-[10px] bg-[var(--z-sunken)]" aria-hidden="true"></div>
	{:else if !data.supported}
		<p class="mt-3 text-[13px] leading-relaxed text-[var(--z-soft)]">
			This mail server does not offer server-side rules
			(<span class="font-mono text-[12px]">urn:ietf:params:jmap:sieve</span>).
		</p>
	{:else if !data.managed}
		<!--
			Someone's hand-written Sieve is not ours to silently replace, so the
			editor stays shut until they say so.
		-->
		<div class="z-railed mt-3 flex items-start gap-[9px] rounded-[10px] border border-[var(--z-ch-needs-solid)] bg-[var(--z-ch-needs-fill)] py-2.5 pr-3 pl-[18px] text-[var(--z-ch-needs-ink)]" style="--z-rail:var(--z-ch-needs-solid);--z-rail-inset:10px">
			<svg class="mt-px size-[15px] shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4" />
				<path d="M8 5v3.6M8 10.7v.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
			</svg>
			<div class="min-w-0 flex-1">
				<p class="text-[13px] font-semibold">A filtering script here was not written by Zaur</p>
				<p class="mt-0.5 text-[12.5px] leading-normal">
					Rules stay read-only until you hand this account over — taking over replaces that script.
				</p>
				{#if data.foreignScript}
					<!-- What would be replaced stays one click away, never silently gone. -->
					<details class="mt-1.5">
						<summary class="cursor-pointer text-[12px] font-medium">Show script</summary>
						<pre class="mt-1.5 max-h-40 overflow-auto rounded-[6px] border border-[var(--z-ch-needs-solid)]/40 bg-[var(--z-surface)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--z-strong)]">{data.foreignScript}</pre>
					</details>
				{/if}
			</div>
			<button
				type="button"
				class="btn-tactile !h-7 shrink-0 !border-[var(--z-ch-needs-solid)] !px-2.5 !text-[12px] !font-semibold !text-[var(--z-ch-needs-ink)]"
				disabled={saving}
				onclick={() => onSave([], true)}
			>
				Take over
			</button>
		</div>
	{:else}
		<div class="mt-3 flex flex-col gap-2">
			{#each draft as rule, index (rule.id)}
				{@const issues = ruleProblems(rule)}
				{#if editingId === rule.id}
					<!-- Editing: the full form for this one rule. -->
					<div class="{card} bg-[var(--z-surface)] shadow-[var(--z-shadow-tactile)]">
						<div class="flex items-center gap-2.5">
							<input
								type="checkbox"
								class="z-check !size-[17px]"
								checked={rule.enabled}
								aria-label={rule.enabled ? 'Disable this rule' : 'Enable this rule'}
								onchange={(event) => patch(rule.id, { enabled: event.currentTarget.checked })}
							/>
							<input
								type="text"
								class="z-field min-w-0 flex-1 !h-[30px] max-md:text-base"
								placeholder="Name this rule"
								value={rule.name}
								oninput={(event) => patch(rule.id, { name: event.currentTarget.value })}
							/>
							<button type="button" class="btn-tactile !h-7 !px-2.5 !text-[12px] !font-semibold" onclick={() => (editingId = null)}>
								Done
							</button>
						</div>

						<!-- Conditions -->
						<div class="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-[var(--z-soft)]">
							<span>If</span>
							<select
								class="z-field !h-[30px]"
								aria-label="Match all or any condition"
								value={rule.match}
								onchange={(event) => patch(rule.id, { match: event.currentTarget.value as 'all' | 'any' })}
							>
								<option value="all">all</option>
								<option value="any">any</option>
							</select>
							<span>of these match</span>
						</div>

						<div class="mt-2 flex flex-col gap-2">
							{#each rule.conditions as condition, conditionIndex (conditionIndex)}
								<div class="flex flex-wrap items-center gap-2">
									<select class="z-field !h-[30px]" aria-label="Field" value={condition.field} onchange={(event) => setCondition(rule.id, conditionIndex, { field: event.currentTarget.value as RuleField })}>
										{#each FIELDS as field (field.value)}
											<option value={field.value}>{field.label}</option>
										{/each}
									</select>
									<select class="z-field !h-[30px]" aria-label="Comparison" value={condition.operator} onchange={(event) => setCondition(rule.id, conditionIndex, { operator: event.currentTarget.value as RuleOperator })}>
										{#each OPERATORS as operator (operator.value)}
											<option value={operator.value}>{operator.label}</option>
										{/each}
									</select>
									<input
										type="text"
										class="z-field min-w-0 flex-1 !h-[30px] max-md:text-base"
										placeholder="…"
										value={condition.value}
										oninput={(event) => setCondition(rule.id, conditionIndex, { value: event.currentTarget.value })}
									/>
									{#if rule.conditions.length > 1}
										<button type="button" class="z-icon-btn shrink-0" aria-label="Remove this condition" onclick={() => patch(rule.id, { conditions: rule.conditions.filter((_: RuleCondition, i: number) => i !== conditionIndex) })}>
											<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
												<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
											</svg>
										</button>
									{/if}
								</div>
							{/each}
							<button type="button" class="btn-tactile !h-[26px] self-start !px-2 !text-[12px]" onclick={() => patch(rule.id, { conditions: [...rule.conditions, { field: 'from', operator: 'contains', value: '' }] })}>
								Add condition
							</button>
						</div>

						<!-- Actions -->
						<div class="z-caption mt-3.5">Then</div>
						<div class="mt-2 flex flex-col gap-2">
							{#each rule.actions as action, actionIndex (actionIndex)}
								<div class="flex flex-wrap items-center gap-2">
									<select class="z-field !h-[30px]" aria-label="Action" value={action.type} onchange={(event) => setAction(rule.id, actionIndex, actionFor(event.currentTarget.value, action))}>
										<option value="fileInto">File into</option>
										<option value="addFlag">Mark</option>
										<option value="discard">Discard</option>
									</select>
									{#if action.type === 'fileInto'}
										<select class="z-field min-w-0 flex-1 !h-[30px]" aria-label="Folder" value={action.mailbox} onchange={(event) => setAction(rule.id, actionIndex, { type: 'fileInto', mailbox: event.currentTarget.value })}>
											{#each fileTargets as target (target.id)}
												<option value={target.name}>{target.name}</option>
											{/each}
										</select>
									{:else if action.type === 'addFlag'}
										<select class="z-field min-w-0 flex-1 !h-[30px]" aria-label="Mark as" value={action.flag} onchange={(event) => setAction(rule.id, actionIndex, { type: 'addFlag', flag: event.currentTarget.value as RuleFlag })}>
											{#each FLAGS as flag (flag.value)}
												<option value={flag.value}>{flag.label}</option>
											{/each}
										</select>
									{:else}
										<span class="flex-1 text-[12.5px] text-[var(--z-soft)]">The message is dropped before it arrives.</span>
									{/if}
									<button type="button" class="z-icon-btn shrink-0" aria-label="Remove this action" onclick={() => patch(rule.id, { actions: rule.actions.filter((_: RuleAction, i: number) => i !== actionIndex) })}>
										<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
											<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
										</svg>
									</button>
								</div>
							{/each}
							<button type="button" class="btn-tactile !h-[26px] self-start !px-2 !text-[12px]" onclick={() => patch(rule.id, { actions: [...rule.actions, actionFor('fileInto', undefined)] })}>
								Add action
							</button>
						</div>

						<div class="mt-3.5 flex flex-wrap items-center justify-between gap-3">
							<label class="flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--z-strong)]">
								<input type="checkbox" class="z-check !size-[17px]" checked={rule.stop} onchange={(event) => patch(rule.id, { stop: event.currentTarget.checked })} />
								Stop checking later rules when this one matches
							</label>
							<div class="flex items-center gap-1.5">
								<!-- Order is meaning: a rule that stops ends the ones below it. -->
								{#if draft.length > 1}
									<button type="button" class="btn-tactile !h-7 !px-2 !text-[12px]" disabled={index === 0} onclick={() => move(rule.id, -1)}>Move up</button>
									<button type="button" class="btn-tactile !h-7 !px-2 !text-[12px]" disabled={index === draft.length - 1} onclick={() => move(rule.id, 1)}>Move down</button>
								{/if}
								<button type="button" class="btn-tactile btn-danger !h-7 !px-2.5 !text-[12px]" onclick={() => removeRule(rule.id)}>
									Delete rule
								</button>
							</div>
						</div>

						{#if issues.length > 0}
							<ul class="mt-2.5 flex flex-col gap-1">
								{#each issues as problem (problem)}
									<li class="text-[12.5px] text-[var(--z-ch-needs-ink)]">{problem}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{:else}
					<!--
						Reading: the rule as a card of chips. An off rule still has a live
						checkbox and Edit, so it is not a disabled control — the card recedes
						by ground, never by opacity.
					-->
					<div class="{card} {rule.enabled ? 'bg-[var(--z-surface)]' : 'bg-[var(--z-hover)]'}">
						<div class="flex items-center gap-2.5">
							<input
								type="checkbox"
								class="z-check !size-[17px]"
								checked={rule.enabled}
								aria-label={rule.enabled ? 'Disable this rule' : 'Enable this rule'}
								onchange={(event) => patch(rule.id, { enabled: event.currentTarget.checked })}
							/>
							<span class="min-w-0 flex-1 truncate text-[13px] font-semibold {rule.enabled ? 'text-[var(--z-ink)]' : 'text-[var(--z-muted)]'}">
								{rule.name.trim() || 'Unnamed rule'}
							</span>
							{#if !rule.enabled}<span class="z-chip">Off</span>{/if}
							{#if rule.stop}<span class="z-chip">Stop</span>{/if}
							{#if issues.length > 0}<span class="z-chip" style={channelStyle(CHANNELS.needs)}>Unfinished</span>{/if}
							<button type="button" class="z-icon-btn shrink-0" aria-label="Edit rule" title="Edit rule" onclick={() => (editingId = rule.id)}>
								<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M11 2.6l2.4 2.4-7.6 7.6-3.2.8.8-3.2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
								</svg>
							</button>
						</div>

						<div class="mt-[9px] flex flex-col gap-[5px] pl-[27px]">
							<div class="flex items-center gap-[7px]">
								<span class="z-mono text-[9.5px] font-semibold tracking-[0.08em] text-[var(--z-soft)] uppercase">
									{rule.match === 'any' ? 'If any of' : 'If all of'}
								</span>
								<span class="h-px flex-1 bg-[var(--z-sunken)]"></span>
							</div>
							{#each rule.conditions as condition, conditionIndex (conditionIndex)}
								<div class="flex flex-wrap items-center gap-[5px]">
									<span class="z-mono rounded-[5px] border border-[var(--z-line)] bg-[var(--z-hover)] px-1.5 text-[10.5px] font-semibold text-[var(--z-strong)]">{condition.field}</span>
									<span class="text-[12px] text-[var(--z-soft)]">{operatorLabel(condition.operator)}</span>
									<span class="z-mono max-w-full truncate rounded-[5px] border border-[var(--z-line)] bg-[var(--z-surface)] px-1.5 text-[10.5px] text-[var(--z-ink)]">{condition.value || '…'}</span>
								</div>
							{/each}
							<div class="mt-[3px] flex flex-wrap items-center gap-1.5">
								<span class="z-mono text-[9.5px] font-semibold tracking-[0.08em] text-[var(--z-soft)] uppercase">Then</span>
								{#each rule.actions as action, actionIndex (actionIndex)}
									<span class="{chip} z-chip-filled" style={channelStyle(actionChannel(action))}>{actionLabel(action)}</span>
								{/each}
								{#if rule.actions.length === 0}
									<span class="text-[12px] text-[var(--z-soft)]">nothing yet</span>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			{/each}

			{#if draft.length === 0}
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<p class="text-[13px] leading-relaxed text-[var(--z-soft)]">
						No rules yet. A rule looks at mail as it arrives and can file it, mark it, or drop it.
					</p>
					<!-- The one rule almost everyone wants, ready to adjust. -->
					<button type="button" class="btn-tactile !h-7 !px-2.5 !text-[12px]" title="Newsletters and notifications out of the inbox, into a digest folder" onclick={addNewslettersRule}>
						Start with a newsletters rule
					</button>
				</div>
			{/if}

			<button type="button" class="btn-tactile !h-[34px] w-full" onclick={addRule}>
				<svg class="size-3.5 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
				Add rule
			</button>
		</div>

		{#if dirty}
			<div class="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
				{#if problems.length > 0}
					<!-- Unfinished rules are kept, just not compiled — say so rather than
					     letting them look saved and working. -->
					<span class="mr-auto text-[12.5px] text-[var(--z-ch-needs-ink)]">Rules that are not finished are saved but will not run.</span>
				{/if}
				<button
					type="button"
					class="btn-tactile btn-primary !h-[34px]"
					disabled={blocked || saving}
					onclick={() => {
						editingId = null;
						onSave($state.snapshot(draft), false);
					}}
				>
					{saving ? 'Saving…' : 'Save rules'}
				</button>
			</div>
		{/if}
	{/if}
</section>
