<script lang="ts">
	// An install line and the button that copies it. The line stays selectable where
	// the clipboard is refused.
	import { t } from '#lib/i18n';

	let { cmd }: { cmd: string } = $props();
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout>;
	const copy = () =>
		navigator.clipboard
			.writeText(cmd)
			.then(() => {
				copied = true;
				clearTimeout(timer);
				timer = setTimeout(() => (copied = false), 2000);
			})
			.catch(() => {});
</script>

<span class="p-install">
	<code>{cmd}</code>
	<button type="button" onclick={copy}><span aria-live="polite">{t(copied ? 'packages.copied' : 'packages.copy')}</span></button>
</span>

<style>
	/* The command and its copy button in one outline, split by a rule. Currentcolor,
	   as it also stands on the sky's ink board. */
	.p-install {
		display: inline-flex;
		max-width: 100%;
		min-height: 1.75rem;
		border: var(--rule) solid currentColor;
		border-radius: 3px;
		font-size: 0.875rem;
	}
	/* The command takes any spare width, so Copy always closes the outline. */
	code {
		flex: 1;
		align-self: center;
		padding: 0.1rem 0.45rem;
		font: inherit;
		user-select: all;
		overflow-wrap: anywhere;
	}
	button {
		flex: none;
		padding: 0 0.6rem;
		border: 0;
		border-left: var(--rule) solid currentColor;
		background: none;
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	button:hover {
		background: var(--chip);
		color: var(--ink);
	}
	button:focus-visible {
		outline-color: currentColor;
		outline-offset: -4px;
	}
	@media (pointer: coarse) {
		.p-install {
			min-height: 2.75rem;
		}
		/* Over the outline's own rules, so the whole 44px is the button. */
		button {
			margin-block: calc(-1 * var(--rule));
		}
	}
</style>
