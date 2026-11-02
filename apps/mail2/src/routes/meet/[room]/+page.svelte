<script lang="ts">
	import { meetName } from '#lib/brand';
	import { page } from '$app/state';
	import MeetLobby, { type MediaChoice } from '#lib/components/meet/MeetLobby.svelte';
	import MeetRoom, { type CallEnd } from '#lib/components/meet/MeetRoom.svelte';
	import MeetIcon from '#lib/components/meet/MeetIcon.svelte';
	import { tick } from 'svelte';
	import { callFullscreen, formatElapsed } from '#lib/meet/call';
	import { nativeMeet } from '#lib/meet/native';
	import { joinCall, type CallTicket } from '../../meet.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** `native`: the Android app's own call screen is on top of this page. */
	let phase = $state<'lobby' | 'room' | 'native' | 'ended'>('lobby');
	let ticket = $state<CallTicket | null>(null);
	let choice = $state<MediaChoice | null>(null);
	let joining = $state(false);
	let error = $state<string | null>(null);
	let end = $state<CallEnd | null>(null);

	const link = $derived(`${page.url.origin}/meet/${data.room}`);

	/*
	 * The lobby follows your theme; the call and the screen after it are dark
	 * whatever the theme, so faces and screens are not framed in white. The
	 * attribute is put back the way the root layout left it.
	 */
	$effect(() => {
		if (phase === 'lobby') return;
		const root = document.documentElement;
		const before = root.dataset.theme;
		root.dataset.theme = 'dark';
		return () => {
			if (before) root.dataset.theme = before;
			else delete root.dataset.theme;
		};
	});

	async function join(next: MediaChoice) {
		// In the Android app the call runs on its native screen (ADR-0006); the ticket is the same.
		const native = nativeMeet();
		// Before the first await, while the tap still counts as one.
		if (!native) callFullscreen();
		choice = next;
		joining = true;
		error = null;
		try {
			ticket = await joinCall({ room: data.room, name: next.name });
		} catch (cause) {
			const body = (cause as { body?: { message?: string } } | null)?.body;
			error = body?.message ?? 'Could not start the video call';
			return;
		} finally {
			joining = false;
		}
		if (!native) {
			phase = 'room';
			return;
		}
		phase = 'native';
		// The lobby goes first, so its preview lets go of the camera and mic the call needs.
		await tick();
		try {
			ended(await native.join({ wsUrl: ticket.wsUrl, token: ticket.token, micOn: next.micOn, camOn: next.camOn }));
		} catch (cause) {
			console.error('Meet: the app could not start the call', cause);
			ended({ failed: 'The app could not start the call.', elapsed: 0, others: 0 });
		}
	}

	function ended(result: CallEnd) {
		end = result;
		phase = 'ended';
	}
</script>

<svelte:head>
	<title>{meetName}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if phase === 'room' && ticket && choice}
	<MeetRoom {ticket} {choice} {link} invite={data.you ? data.room : null} onEnd={ended} />
{:else if phase === 'native'}
	<!-- Behind the app's call screen: seen as it opens or closes, and while the call is a small window. -->
	<main class="z-screen flex items-center justify-center bg-[var(--z-ground)] px-6 text-center text-[13px] text-[var(--z-soft)]">
		The call is on in its own window. Tap the small window to go back to it.
	</main>
{:else if phase === 'ended' && end && choice}
	{@const failed = error ?? end.failed}
	<main class="z-screen flex flex-col items-center justify-center gap-3.5 bg-[var(--z-ground)] px-6 text-center text-[var(--z-ink)]">
		{#if failed}
			<span class="flex size-9 items-center justify-center rounded-[9px] border border-[var(--z-ch-discard-stroke)] bg-[color-mix(in_oklab,var(--z-ch-discard-stroke)_22%,var(--z-surface))] text-[var(--z-ch-discard-ink)]">
				<MeetIcon name="alert" />
			</span>
			<div>
				<h1 class="text-[15px] font-semibold">{end.elapsed ? 'You are out of the call' : 'Could not join the call'}</h1>
				<p class="mx-auto mt-1 max-w-[300px] text-[12.5px] leading-normal text-[var(--z-muted)]">{failed}</p>
			</div>
		{:else}
			<div>
				<h1 class="text-[15px] font-semibold">You left the call</h1>
				<div class="z-mono mt-1 text-[11px] text-[var(--z-soft)]">
					{formatElapsed(end.elapsed)}{end.others ? ` · ${end.others} still there` : ''}
				</div>
			</div>
		{/if}
		<div class="flex gap-2">
			<button type="button" class="btn-tactile btn-primary !h-[34px] !px-3.5" disabled={joining} onclick={() => choice && join(choice)}>
				{#if failed}<MeetIcon name="refresh" />{/if}
				{joining ? 'Joining…' : failed ? 'Try again' : 'Rejoin'}
			</button>
			{#if data.you}
				{#if data.calendar}
					<a class="btn-tactile !h-[34px]" href="/calendar"><MeetIcon name="calendar" /> Back to Calendar</a>
				{:else}
					<a class="btn-tactile !h-[34px]" href="/">Back to Mail</a>
				{/if}
			{/if}
		</div>
	</main>
{:else}
	<MeetLobby room={data.room} {link} you={data.you} here={data.here} {joining} {error} onJoin={join} />
{/if}
