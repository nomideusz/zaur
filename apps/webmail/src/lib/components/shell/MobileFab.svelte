<script lang="ts">
	import { page } from '$app/state';
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import { isMailPath } from '$lib/mail/routes';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';

	/* The one floating control on mobile: the current section's primary action.
	   Everything else (navigation, filters, accounts) lives in the top bar's
	   hamburger drawer. */

	const pathname = $derived(page.url.pathname);
	const onMailList = $derived(
		(pathname === '/' || isMailPath(pathname)) &&
			!pathname.startsWith('/mail/compose') &&
			!pathname.startsWith('/mail/search') &&
			!/^\/mail\/[^/]+\/[^/]+/.test(pathname)
	);
	const onCalendar = $derived(pathname.startsWith('/calendar'));
	const onSection = $derived(pathname.startsWith('/contacts') || pathname.startsWith('/files'));

	const pageAction = $derived(shellHeader.page?.primaryAction);

	type FabAction =
		| { kind: 'link'; href: string; label: string; icon: typeof Plus }
		| { kind: 'button'; onclick: () => void; label: string; icon: typeof Plus };

	const action = $derived.by((): FabAction | null => {
		/* The in-flow bulk action bar owns the bottom edge while selecting. */
		if (onMailList && !mail.hasSelection) {
			return { kind: 'link', href: '/mail/compose', label: 'New', icon: PenSquare };
		}
		if (onCalendar && calendar.supported !== false) {
			return {
				kind: 'button',
				onclick: () => calendar.openCompose(),
				label: 'New event',
				icon: CalendarPlus
			};
		}
		if (onSection && pageAction?.kind === 'link') {
			return { kind: 'link', href: pageAction.href, label: pageAction.label, icon: Plus };
		}
		if (onSection && pageAction?.kind === 'button') {
			return { kind: 'button', onclick: pageAction.onclick, label: pageAction.label, icon: Plus };
		}
		return null;
	});

	/* Panes add bottom scroll clearance only while a FAB is floating over them. */
	$effect(() => {
		document.documentElement.toggleAttribute('data-z-fab', !!action);
		return () => document.documentElement.removeAttribute('data-z-fab');
	});
</script>

{#if action}
	{@const Icon = action.icon}
	<div class="z-mobile-fab md:hidden" data-testid="mobile-fab">
		{#if action.kind === 'link'}
			<a href={action.href} class="z-mobile-fab__pill" aria-label={action.label}>
				<Icon class="size-[1.125rem]" aria-hidden="true" />
				<span>{action.label}</span>
			</a>
		{:else}
			<button type="button" class="z-mobile-fab__pill" aria-label={action.label} onclick={action.onclick}>
				<Icon class="size-[1.125rem]" aria-hidden="true" />
				<span>{action.label}</span>
			</button>
		{/if}
	</div>
{/if}
