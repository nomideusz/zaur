<script lang="ts">
	import type { Contact, ContactInput } from '@zaur/mail-core';

	/**
	 * Create or edit one contact. The form is the `ContactInput` shape and
	 * nothing more — what it does not show (addresses, photos) is left alone
	 * on the server because saves go out as patches.
	 */
	let {
		contact = null,
		saving = false,
		error = null,
		onSave,
		onCancel
	}: {
		contact?: Contact | null;
		saving?: boolean;
		error?: string | null;
		onSave: (input: ContactInput) => void;
		onCancel: () => void;
	} = $props();

	const blank = (): ContactInput => ({
		given: '',
		surname: '',
		nickname: '',
		organization: '',
		title: '',
		emails: [{ address: '', label: '' }],
		phones: [{ number: '', label: '' }],
		note: ''
	});

	function seed(source: Contact | null): ContactInput {
		if (!source) return blank();
		return {
			given: source.given || (source.surname ? '' : source.name),
			surname: source.surname,
			nickname: source.nickname,
			organization: source.organization,
			title: source.title,
			emails: source.emails.length
				? source.emails.map((email) => ({ address: email.address, label: email.label }))
				: [{ address: '', label: '' }],
			phones: source.phones.length
				? source.phones.map((phone) => ({ number: phone.number, label: phone.label }))
				: [{ number: '', label: '' }],
			note: source.note
		};
	}

	let draft = $state<ContactInput>(blank());
	// A different contact arriving means a different form, not a patched one.
	$effect(() => {
		contact?.id;
		draft = seed(contact);
	});

	const canSave = $derived(
		Boolean(
			draft.given.trim() ||
				draft.surname.trim() ||
				draft.organization.trim() ||
				draft.emails.some((email) => email.address.includes('@'))
		)
	);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSave || saving) return;
		onSave({
			...draft,
			emails: draft.emails.filter((email) => email.address.trim()),
			phones: draft.phones.filter((phone) => phone.number.trim())
		});
	}

	const field = 'z-field w-full max-md:text-base';
	const label = 'block text-[12px] text-[var(--z-soft)]';
</script>

<form onsubmit={submit} class="flex h-full flex-col">
	<div class="flex items-center justify-between gap-3 border-b border-[var(--z-hairline)] px-6 py-3 max-md:px-4">
		<h2 class="text-[14px] font-semibold text-[var(--z-ink)]">{contact ? 'Edit contact' : 'New contact'}</h2>
		<div class="flex items-center gap-2">
			<button type="button" class="btn-tactile !h-[30px]" onclick={onCancel} disabled={saving}>Cancel</button>
			<button
				type="submit"
				class="btn-tactile !h-[30px] btn-primary disabled:!border-[var(--z-hairline)] disabled:!bg-[var(--z-sunken)] disabled:!text-[var(--z-faint)]"
				disabled={!canSave || saving}
			>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
		<div class="mx-auto flex max-w-[560px] flex-col gap-4">
			{#if error}
				<p class="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">{error}</p>
			{/if}

			<div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
				<label>
					<span class={label}>First name</span>
					<input class="{field} mt-1" bind:value={draft.given} autocomplete="off" />
				</label>
				<label>
					<span class={label}>Last name</span>
					<input class="{field} mt-1" bind:value={draft.surname} autocomplete="off" />
				</label>
				<label>
					<span class={label}>Nickname</span>
					<input class="{field} mt-1" bind:value={draft.nickname} autocomplete="off" />
				</label>
				<label>
					<span class={label}>Organisation</span>
					<input class="{field} mt-1" bind:value={draft.organization} autocomplete="off" />
				</label>
				<label class="col-span-2 max-md:col-span-1">
					<span class={label}>Job title</span>
					<input class="{field} mt-1" bind:value={draft.title} autocomplete="off" />
				</label>
			</div>

			<fieldset>
				<legend class="z-caption">Email</legend>
				<div class="mt-2 flex flex-col gap-2">
					{#each draft.emails as email, index (index)}
						<div class="flex items-center gap-2">
							<input class="{field} min-w-0 flex-1" type="email" placeholder="name@example.com" bind:value={email.address} />
							<input class="z-field w-[110px] max-md:text-base" placeholder="work" list="contact-labels" bind:value={email.label} aria-label="Label" />
							<button type="button" class="btn-tactile !size-[30px] !p-0 text-[var(--z-soft)]" aria-label="Remove address" onclick={() => draft.emails.splice(index, 1)} disabled={draft.emails.length === 1 && !email.address}>
								<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
							</button>
						</div>
					{/each}
					<button type="button" class="btn-tactile self-start !h-[28px] text-[12px]" onclick={() => draft.emails.push({ address: '', label: '' })}>Add address</button>
				</div>
			</fieldset>

			<fieldset>
				<legend class="z-caption">Phone</legend>
				<div class="mt-2 flex flex-col gap-2">
					{#each draft.phones as phone, index (index)}
						<div class="flex items-center gap-2">
							<input class="{field} min-w-0 flex-1" type="tel" placeholder="+48 …" bind:value={phone.number} />
							<input class="z-field w-[110px] max-md:text-base" placeholder="mobile" list="contact-labels" bind:value={phone.label} aria-label="Label" />
							<button type="button" class="btn-tactile !size-[30px] !p-0 text-[var(--z-soft)]" aria-label="Remove number" onclick={() => draft.phones.splice(index, 1)} disabled={draft.phones.length === 1 && !phone.number}>
								<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
							</button>
						</div>
					{/each}
					<button type="button" class="btn-tactile self-start !h-[28px] text-[12px]" onclick={() => draft.phones.push({ number: '', label: '' })}>Add number</button>
				</div>
			</fieldset>

			<label>
				<span class={label}>Notes</span>
				<textarea class="z-field mt-1 !h-auto w-full py-1.5 max-md:text-base" rows="4" bind:value={draft.note}></textarea>
			</label>

			<datalist id="contact-labels">
				<option value="work"></option>
				<option value="home"></option>
				<option value="mobile"></option>
				<option value="other"></option>
			</datalist>
		</div>
	</div>
</form>
