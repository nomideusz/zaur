<script lang="ts">
	import { confirmation } from '#lib/confirm.svelte.ts';

	/**
	 * The question `ask` puts: a native modal <dialog>, so the top layer clears
	 * the compose panels and the attachment preview, Escape cancels, and focus
	 * goes back where it was. A destructive question starts on Cancel — Enter
	 * on reflex keeps the mail — and its action wears the discard channel; a
	 * neutral one starts on its action, the accent's one filled button.
	 */
	const request = $derived(confirmation.open);
	const danger = $derived(request?.tone !== 'neutral');
	const id = $props.id();

	function modal(node: HTMLDialogElement) {
		node.showModal();
		node.querySelector<HTMLElement>(danger ? '[data-cancel]' : '[data-action]')?.focus();
		return () => node.close();
	}
</script>

{#if request}
	{#key request}
		<!-- A click on the backdrop lands on the dialog itself; one inside lands on the card. -->
		<dialog
			{@attach modal}
			role="alertdialog"
			aria-labelledby="{id}-title"
			aria-describedby={request.body ? `${id}-body` : undefined}
			class="z-confirm m-auto w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[12px] border border-[var(--z-line)] bg-[var(--z-surface)] p-0 text-[var(--z-ink)] shadow-[var(--z-shadow-panel)] outline-none backdrop:bg-[var(--z-scrim)]"
			oncancel={(event) => {
				event.preventDefault();
				request.settle(false);
			}}
			onclick={(event) => event.target === event.currentTarget && request.settle(false)}
			onkeydown={(event) => {
				// The page's shortcuts (#, e, j/k…) must not act behind the question.
				event.stopPropagation();
			}}
		>
			<div class="px-5 pt-[18px] pb-5">
				<h2 id="{id}-title" class="text-[15px] leading-[1.35] font-semibold text-balance text-[var(--z-ink)]">
					{request.title}
				</h2>
				{#if request.body}
					<p id="{id}-body" class="mt-1.5 text-[13.5px] leading-[1.55] text-pretty text-[var(--z-muted)]">{request.body}</p>
				{/if}
			</div>
			<div class="z-card-foot justify-end !rounded-none !py-3 max-md:[&>button]:flex-1">
				<button type="button" data-cancel class="btn-tactile !h-8 max-md:!h-11" onclick={() => request.settle(false)}>
					Cancel
				</button>
				<button
					type="button"
					data-action
					class="btn-tactile {danger ? 'btn-destroy' : 'btn-primary'} !h-8 max-md:!h-11"
					onclick={() => request.settle(true)}
				>
					{request.action}
				</button>
			</div>
		</dialog>
	{/key}
{/if}
