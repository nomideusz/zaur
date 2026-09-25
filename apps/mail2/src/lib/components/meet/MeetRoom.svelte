<script lang="ts" module>
	/** How a call ended, for the screen after it. */
	export interface CallEnd {
		/** Why it failed; absent when you left. */
		failed?: string;
		elapsed: number;
		others: number;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { LocalAudioTrack, LocalVideoTrack, Participant, Room, ScreenShareCaptureOptions, Track } from 'livekit-client';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { isSafariUserAgent } from '@zaur/mail-core/utils/meet';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';
	import { GUEST_PREFIX, TILE_ASPECT, deviceProblem, fitGrid, formatElapsed, rosterOrder, type RosterEntry } from '#lib/meet/call';
	import type { CallTicket } from '../../../routes/meet.remote';
	import type { MediaChoice } from './MeetLobby.svelte';
	import MeetIcon, { type MeetIconName } from './MeetIcon.svelte';
	import MeetMedia from './MeetMedia.svelte';

	interface Props {
		ticket: CallTicket;
		choice: MediaChoice;
		link: string;
		/** The room id, for "Email an invite"; only a signed-in person has a Mail to open. */
		invite: string | null;
		onEnd: (end: CallEnd) => void;
	}

	let { ticket, choice, link, invite, onEnd }: Props = $props();

	interface Person extends RosterEntry {
		sid: string;
		identity: string;
		guest: boolean;
		micOn: boolean;
		speaking: boolean;
		cam: Track | undefined;
		screen: Track | undefined;
	}

	type LK = typeof import('livekit-client');
	let LK: LK | undefined;
	let lk: Room | undefined;
	let leaving = false;

	let status = $state<'connecting' | 'live' | 'reconnecting'>('connecting');
	let quality = $state('good');
	let people = $state.raw<Person[]>([]);
	let sounds = $state.raw<Track[]>([]);
	let micOn = $state(false);
	let camOn = $state(false);
	let sharing = $state(false);
	let handUp = $state(false);
	let playbackBlocked = $state(false);
	let notice = $state<{ text: string; retry?: () => void } | null>(null);
	let panelOpen = $state(false);
	let copied = $state(false);
	let startedAt = $state(0);
	let now = $state(Date.now());
	let stageW = $state(0);
	let stageH = $state(0);
	let devices = $state.raw<MediaDeviceInfo[]>([]);
	let selected = $state<Partial<Record<MediaDeviceKind, string>>>({});
	/** Grid or Speaker, picked in the header; null until you pick, and the call decides. */
	let view = $state<'grid' | 'speaker' | null>(null);
	/** Who Speaker view shows: whoever spoke last, kept through a silence. */
	let lastSpoke = $state('');
	let facing = $state<'user' | 'environment'>('user');
	let noiseSuppression = $state(true);

	/*
	 * iOS and iPadOS Safari have no getDisplayMedia at all — feature-detect
	 * rather than guess from the pointer, which hid Share on touchscreen
	 * laptops and showed it where it could never work.
	 */
	const canShare = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
	const canPickSpeaker = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
	const nativeShare =
		typeof navigator !== 'undefined' && typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches;

	const me = $derived(people.find((p) => p.isLocal));
	const presenter = $derived(people.find((p) => p.screen));
	// Until you pick, Speaker while someone presents or it is the two of you, Grid otherwise.
	const speakerView = $derived(view ? view === 'speaker' : Boolean(presenter) || people.length === 2);
	const featured = $derived(people.find((p) => !p.isLocal && p.sid === lastSpoke) ?? people.find((p) => !p.isLocal));
	const layout = $derived(
		presenter && speakerView
			? 'focus'
			: people.length <= 1 && !presenter
				? 'solo'
				: !speakerView
					? 'grid'
					: people.length === 2
						? 'pair'
						: 'focus'
	);
	const pad = $derived(stageW < 768 ? 10 : 16);
	// In Grid, a shared screen is one more tile.
	const grid = $derived(
		fitGrid(people.length + (presenter ? 1 : 0), stageW - 2 * pad, stageH - 2 * pad, 12, stageW < 640 ? 3 / 4 : TILE_ASPECT)
	);
	const cameras = $derived(devices.filter((d) => d.kind === 'videoinput').length);
	const roster = $derived(rosterOrder(people));
	const hands = $derived(roster.filter((p) => p.handSince));

	const ORDINAL = ['first', 'second', 'third'];
	const KIND_LABEL: Record<MediaDeviceKind, string> = { audioinput: 'Microphone', audiooutput: 'Speakers', videoinput: 'Camera' };

	/*
	 * A call is dark whatever the theme, so the four channels that mean
	 * something here are washes on the dark surface: red for off and broken,
	 * amber for a raised hand, blue for presenting and a pressed toggle.
	 */
	const PLAIN = 'border-[var(--z-line)] bg-[var(--z-surface)] text-[var(--z-body)] shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:bg-[var(--z-hover)]';
	const OFF = 'border-[var(--z-ch-discard-stroke)] bg-[color-mix(in_oklab,var(--z-ch-discard-stroke)_26%,var(--z-surface))] text-[var(--z-ch-discard-ink)]';
	const NEEDS = 'border-[var(--z-ch-needs-stroke)] bg-[color-mix(in_oklab,var(--z-ch-needs-stroke)_26%,var(--z-surface))] text-[var(--z-ch-needs-ink)]';
	const ON = 'border-[var(--z-ch-correspondence-stroke)] bg-[color-mix(in_oklab,var(--z-ch-correspondence-stroke)_26%,var(--z-surface))] text-[var(--z-ch-correspondence-ink)]';
	const CTRL =
		'inline-flex h-11 cursor-pointer items-center gap-2 border px-3.5 text-[13px] font-semibold transition-colors max-md:size-[52px] max-md:justify-center max-md:rounded-[14px] max-md:px-0';
	const CHIP = 'flex items-center gap-1.5 rounded-[6px] border font-semibold';

	const seed = (p: Person) => (p.guest ? p.name : p.identity);
	const label = (p: Person) => (p.isLocal ? `${p.name} (you)` : p.guest ? `${p.name} · guest` : p.name);

	function subline(p: Person): string {
		if (p.isLocal) return 'You';
		if (p === presenter) return 'Presenting';
		const hand = hands.indexOf(p);
		if (hand >= 0) return `Raised hand · ${ORDINAL[hand] ?? `#${hand + 1}`}`;
		if (p.guest) return 'Guest · joined with the link';
		return p.identity;
	}

	/** Everything on screen is read back off the room, never inferred from our own clicks. */
	function sync() {
		if (!lk || !LK) return;
		const { Source } = LK.Track;
		const local = lk.localParticipant;
		const person = (p: Participant, isLocal: boolean): Person => {
			const live = (source: Track.Source) => {
				const pub = p.getTrackPublication(source);
				return pub && !pub.isMuted ? pub.track : undefined;
			};
			return {
				sid: p.sid || p.identity,
				identity: p.identity,
				name: isLocal ? ticket.name : p.name?.trim() || p.identity,
				isLocal,
				guest: p.identity.startsWith(GUEST_PREFIX),
				micOn: p.isMicrophoneEnabled,
				speaking: p.isSpeaking,
				handSince: Number(p.attributes.hand) || null,
				cam: live(Source.Camera),
				screen: live(Source.ScreenShare)
			};
		};
		const remotes = [...lk.remoteParticipants.values()];
		// Join order, you last: the grid does not reshuffle when someone speaks.
		people = [...remotes.map((p) => person(p, false)), person(local, true)];
		sounds = remotes.flatMap((p) => [...p.audioTrackPublications.values()].flatMap((pub) => (pub.track ? [pub.track] : [])));
		micOn = local.isMicrophoneEnabled;
		camOn = local.isCameraEnabled;
		sharing = local.isScreenShareEnabled;
		handUp = Boolean(local.attributes.hand);
		quality = local.connectionQuality;
		playbackBlocked = !lk.canPlaybackAudio || !lk.canPlaybackVideo;
		const loud = lk.activeSpeakers.find((p) => p !== local);
		if (loud) lastSpoke = loud.sid || loud.identity;
	}

	onMount(() => {
		const tick = setInterval(() => (now = Date.now()), 1000);
		void (async () => {
			LK = await import('livekit-client');
			if (leaving) return;
			const { Room, RoomEvent, DisconnectReason } = LK;
			const room = new Room({
				adaptiveStream: true,
				dynacast: true,
				audioCaptureDefaults: { deviceId: choice.mic },
				// Phones default to whichever camera the OS lists first — usually the rear one.
				videoCaptureDefaults: { deviceId: choice.cam, facingMode: 'user' },
				audioOutput: { deviceId: choice.speaker }
			});
			lk = room;
			for (const event of [
				RoomEvent.ParticipantConnected,
				RoomEvent.ParticipantDisconnected,
				RoomEvent.ParticipantNameChanged,
				RoomEvent.ParticipantAttributesChanged,
				RoomEvent.TrackPublished,
				RoomEvent.TrackUnpublished,
				RoomEvent.TrackSubscribed,
				RoomEvent.TrackUnsubscribed,
				// Screen share is usually stopped from the browser's own bar, and the
				// camera can be taken back by the OS: both arrive as these.
				RoomEvent.TrackMuted,
				RoomEvent.TrackUnmuted,
				RoomEvent.LocalTrackPublished,
				RoomEvent.LocalTrackUnpublished,
				RoomEvent.ActiveSpeakersChanged,
				RoomEvent.ConnectionQualityChanged,
				// Android blocks autoplay far more often than iOS; offer a tap to resume.
				RoomEvent.AudioPlaybackStatusChanged,
				RoomEvent.VideoPlaybackStatusChanged
			])
				room.on(event, sync);
			room
				.on(RoomEvent.Reconnecting, () => (status = 'reconnecting'))
				.on(RoomEvent.Reconnected, () => {
					status = 'live';
					sync();
				})
				.on(RoomEvent.ActiveDeviceChanged, (kind, deviceId) => (selected[kind] = deviceId))
				.on(RoomEvent.MediaDevicesError, (cause, kind) => {
					notice = { text: deviceProblem(cause, kind === 'videoinput' ? 'camera' : 'microphone') };
				})
				.on(RoomEvent.Disconnected, (reason) => {
					if (leaving) return;
					leaving = true;
					onEnd({
						failed:
							reason === DisconnectReason.DUPLICATE_IDENTITY
								? 'You joined this call somewhere else, so this window left it.'
								: 'The connection to the call was lost.',
						elapsed: Date.now() - startedAt,
						others: 0
					});
				});

			try {
				await room.connect(ticket.wsUrl, ticket.token);
			} catch (cause) {
				console.error('Zaur Meet: connect failed', cause);
				if (leaving) return;
				leaving = true;
				onEnd({ failed: 'The call server did not answer. The link is fine — try again in a moment.', elapsed: 0, others: 0 });
				return;
			}
			if (leaving) return void room.disconnect();
			startedAt = Date.now();
			status = 'live';
			sync();
			if (choice.micOn) await setLocal('microphone', true);
			if (choice.camOn) await setLocal('camera', true);
			// A second camera is what puts "back camera" under More.
			await loadDevices();
		})();
		return () => {
			clearInterval(tick);
			leaving = true;
			void lk?.disconnect();
		};
	});

	/**
	 * WebKit captures at a uselessly low resolution — or fails outright — when
	 * getDisplayMedia is given width/height constraints (webkit.org/b/263015),
	 * and livekit-client's own guard only matches Safari 17. A zeroed
	 * resolution is the SDK's documented "uncapped".
	 */
	function shareOptions(): ScreenShareCaptureOptions | undefined {
		return isSafariUserAgent(navigator.userAgent) ? { resolution: { width: 0, height: 0, frameRate: 30 } } : undefined;
	}

	async function setLocal(kind: 'microphone' | 'camera' | 'screen', enabled: boolean): Promise<void> {
		const local = lk?.localParticipant;
		if (!local) return;
		notice = null;
		try {
			if (kind === 'microphone') await local.setMicrophoneEnabled(enabled);
			else if (kind === 'camera') await local.setCameraEnabled(enabled);
			// Must stay in the click's task: Safari drops the user gesture across an await.
			else await local.setScreenShareEnabled(enabled, shareOptions());
		} catch (cause) {
			// Cancelling the screen picker throws too; that is not a failure.
			const name = (cause as { name?: string } | null)?.name;
			if (kind === 'screen') {
				if (name !== 'NotAllowedError' && name !== 'AbortError') notice = { text: 'Could not share your screen' };
			} else {
				notice = { text: deviceProblem(cause, kind), retry: () => void setLocal(kind, enabled) };
			}
		}
		sync();
	}

	const toggleMic = () => void setLocal('microphone', !micOn);
	const toggleCam = () => void setLocal('camera', !camOn);
	// Not async: keeps getDisplayMedia inside the user gesture.
	const toggleShare = () => void setLocal('screen', !sharing);

	function toggleHand() {
		// An empty value deletes the attribute; the time orders the hands.
		lk?.localParticipant.setAttributes({ hand: handUp ? '' : String(Date.now()) }).catch(() => {
			notice = { text: 'Could not raise your hand' };
		});
	}

	async function resumePlayback() {
		if (!lk) return;
		await Promise.allSettled([lk.startAudio(), lk.startVideo()]);
		sync();
	}

	async function loadDevices() {
		devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.deviceId);
		for (const kind of ['audioinput', 'audiooutput', 'videoinput'] as const) {
			selected[kind] ??= lk?.getActiveDevice(kind) ?? 'default';
		}
	}

	/**
	 * A phone's cameras by the way they face, whatever the OS names them. The
	 * track keeps the constraint, so the camera comes back the same way after
	 * it is turned off and on.
	 */
	async function flipCamera() {
		const track = lk?.localParticipant.getTrackPublication(LK!.Track.Source.Camera)?.track as LocalVideoTrack | undefined;
		if (!track) return;
		const next = facing === 'user' ? 'environment' : 'user';
		try {
			await track.restartTrack({ facingMode: next });
			facing = next;
			selected.videoinput = track.mediaStreamTrack.getSettings().deviceId;
		} catch (cause) {
			notice = { text: deviceProblem(cause, 'camera') };
		}
	}

	/**
	 * The browser's own noise suppression, with Chrome's stronger voice
	 * isolation alongside it: on unless you turn it off. It is a capture
	 * setting, so a mic already captured is captured again with it (muted
	 * stays muted); one not yet on takes it from the defaults.
	 */
	async function setNoiseSuppression(on: boolean) {
		const defaults = lk?.options.audioCaptureDefaults;
		if (!lk || !LK || !defaults) return;
		noiseSuppression = on;
		Object.assign(defaults, { noiseSuppression: on, voiceIsolation: on });
		const track = lk.localParticipant.getTrackPublication(LK.Track.Source.Microphone)?.track as LocalAudioTrack | undefined;
		try {
			await track?.restartTrack({ ...defaults });
			// The new capture starts enabled, and LiveKit's mute() is a no-op on a muted track.
			if (track?.isMuted) track.mediaStreamTrack.enabled = false;
		} catch (cause) {
			notice = { text: deviceProblem(cause, 'microphone') };
		}
	}

	async function pickDevice(kind: MediaDeviceKind, deviceId: string) {
		try {
			await lk?.switchActiveDevice(kind, deviceId);
			selected[kind] = deviceId;
		} catch (cause) {
			notice = { text: deviceProblem(cause, kind === 'videoinput' ? 'camera' : 'microphone') };
		}
	}

	function leave() {
		if (leaving) return;
		leaving = true;
		const others = lk?.remoteParticipants.size ?? 0;
		void lk?.disconnect();
		onEnd({ elapsed: startedAt ? Date.now() - startedAt : 0, others });
	}

	async function copyLink() {
		if (nativeShare) {
			await navigator.share({ title: 'Zaur Meet', url: link }).catch(() => {});
			return;
		}
		await navigator.clipboard.writeText(link);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function onKey(event: KeyboardEvent) {
		if (status !== 'live' || event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
		if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
		const act = { m: toggleMic, v: toggleCam, h: toggleHand, p: () => (panelOpen = !panelOpen) }[event.key.toLowerCase()];
		if (!act) return;
		event.preventDefault();
		act();
	}

	const statusLine = $derived(
		status === 'connecting'
			? { text: 'Joining…', dot: 'bg-[var(--z-faint)]' }
			: status === 'reconnecting'
				? { text: 'Reconnecting…', dot: 'bg-[var(--z-ch-needs-stroke)]' }
				: quality === 'poor'
					? { text: 'Weak connection', dot: 'bg-[var(--z-ch-needs-stroke)]' }
					: quality === 'lost'
						? { text: 'Connection lost', dot: 'bg-[var(--z-ch-discard-stroke)]' }
						: { text: 'Good connection', dot: 'bg-[var(--z-ch-confirmed-stroke)]' }
	);
</script>

<svelte:window onkeydown={onKey} />

{#snippet bars(height = 11)}
	<span class="flex items-end gap-0.5" style:height="{height}px" aria-hidden="true">
		<span class="w-0.5 rounded-[1px] bg-[var(--z-ch-confirmed-stroke)]" style:height="{Math.round(height * 0.55)}px"></span>
		<span class="w-0.5 rounded-[1px] bg-[var(--z-ch-confirmed-stroke)]" style:height="{height}px"></span>
		<span class="w-0.5 rounded-[1px] bg-[var(--z-ch-confirmed-stroke)]" style:height="{Math.round(height * 0.7)}px"></span>
	</span>
{/snippet}

{#snippet tile(p: Person, small = false)}
	<!-- Speaking is said twice, by the ring and by the bars, never by colour alone. -->
	<div
		class="relative size-full overflow-hidden bg-[var(--z-sunken)] {small ? 'rounded-[10px]' : 'rounded-[12px]'} {p.speaking
			? 'shadow-[0_0_0_2px_var(--z-ch-confirmed-stroke),0_0_0_5px_color-mix(in_oklab,var(--z-ch-confirmed-stroke)_30%,transparent)]'
			: 'shadow-[0_0_0_1px_var(--z-hairline)]'}"
	>
		{#if p.cam}
			<!-- You see yourself mirrored, as in the lobby; the back camera shows the room as it is. -->
			<MeetMedia track={p.cam} class="size-full object-cover {p.isLocal && facing === 'user' ? '-scale-x-100' : ''}" />
		{:else}
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
				<span
					class="z-avatar {small ? '!size-10 !rounded-[10px] !text-[13px]' : '!size-[72px] !rounded-[16px] !text-[22px]'}"
					style={identityStyle(seed(p))}
				>
					{initials(p.name, '')}
				</span>
				{#if !small}<span class="text-[12.5px] text-[var(--z-soft)]">Camera off</span>{/if}
			</div>
		{/if}
		{#if p.handSince}
			<span class="absolute {small ? 'top-1.5 left-1.5 p-0.5' : 'top-2.5 left-2.5 py-0.5 pr-2 pl-1.5'} text-[12px] {CHIP} {NEEDS}">
				<MeetIcon name="hand" class="size-3.5" />
				{#if !small}Hand raised{/if}
			</span>
		{/if}
		<span
			class="absolute flex items-center gap-1.5 overflow-hidden rounded-[6px] border border-white/10 bg-[rgba(7,11,16,0.72)] font-medium whitespace-nowrap text-[#e8eef6] {small
				? 'bottom-1.5 left-1.5 max-w-[calc(100%-12px)] px-1.5 py-px text-[11px]'
				: 'bottom-2.5 left-2.5 max-w-[calc(100%-20px)] px-2 py-0.5 text-[12.5px]'}"
		>
			{#if !p.micOn}<span class="text-[var(--z-ch-discard-stroke)]" title="Muted"><MeetIcon name="mic-off" class="size-[13px]" /></span>{/if}
			{#if p.speaking}{@render bars()}{/if}
			<span class="truncate">{label(p)}</span>
		</span>
	</div>
{/snippet}

{#snippet screen(p: Person)}
	<!-- A screen share is what everyone is there to look at: letterboxed, never cropped. -->
	<div class="relative size-full overflow-hidden rounded-[12px] bg-black">
		{#if p.isLocal}
			<!-- Your own screen, shown back to you, is a hall of mirrors. -->
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
				<div class="text-[15px] font-semibold text-[var(--z-ink)]">Everyone can see your screen</div>
				<button type="button" class="btn-tactile" onclick={toggleShare}>Stop sharing</button>
			</div>
		{:else if p.screen}
			<MeetMedia track={p.screen} class="size-full object-contain" />
		{/if}
		<span class="absolute top-3 left-3 py-0.5 pr-2.5 pl-1.5 text-[12.5px] {CHIP} {ON}">
			<MeetIcon name="share" class="size-3.5" />
			{p.isLocal ? 'You are presenting' : `${p.name} is presenting`}
		</span>
	</div>
{/snippet}

{#snippet linkRow(tall = false)}
	<div
		class="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-[var(--z-line)] bg-[var(--z-sunken)] pr-1 pl-2.5 {tall
			? 'h-[34px] max-md:h-10'
			: 'h-[34px]'}"
	>
		<span class="text-[var(--z-faint)]"><MeetIcon name="link" /></span>
		<span class="z-mono min-w-0 flex-1 truncate text-[11.5px] text-[var(--z-strong)]">{link.replace(/^https?:\/\//, '')}</span>
		<button type="button" class="btn-tactile !h-[26px] !px-2 !text-[12px]" onclick={copyLink}>
			<MeetIcon name={nativeShare ? 'share-out' : copied ? 'check' : 'copy'} class="size-3.5" />
			{nativeShare ? 'Share' : copied ? 'Copied' : 'Copy'}
		</button>
	</div>
{/snippet}

{#snippet emailInvite(full = false)}
	{#if invite}
		<!-- Mail opens in a new tab with a draft; the call keeps going here. -->
		<a
			class="btn-tactile !h-[34px] !text-[12.5px] !font-semibold {full ? 'w-full' : ''}"
			href="/?invite={encodeURIComponent(invite)}"
			target="_blank"
			rel="noopener"
		>
			<MeetIcon name="mail" class="size-3.5" /> Email an invite
		</a>
	{/if}
{/snippet}

{#snippet devicePicks(kind: MediaDeviceKind)}
	<div class="z-menu-caption">{KIND_LABEL[kind]}</div>
	{#each devices.filter((d) => d.kind === kind) as device (device.deviceId)}
		<Menu.Item value="{kind}:{device.deviceId}" class="z-menu-item" onSelect={() => pickDevice(kind, device.deviceId)}>
			<span class="flex w-4 shrink-0 text-[var(--z-accent)]">
				{#if selected[kind] === device.deviceId}<MeetIcon name="check" />{/if}
			</span>
			<span class="truncate">{device.label || KIND_LABEL[kind]}</span>
		</Menu.Item>
	{:else}
		<div class="px-2.5 py-1.5 text-[13px] text-[var(--z-soft)]">None found</div>
	{/each}
{/snippet}

<!-- The chevron beside Mic or Camera, or the header's Settings with every device. -->
{#snippet deviceMenu(kinds: MediaDeviceKind[], title: string, trigger: 'chevron' | 'settings', look: string)}
	<Menu.Root
		positioning={{ placement: trigger === 'chevron' ? 'top-start' : 'bottom-end', gutter: 8, overflowPadding: 12 }}
		lazyMount
		unmountOnExit
		onOpenChange={(details) => details.open && loadDevices()}
	>
		<Menu.Trigger
			class="inline-flex cursor-pointer items-center justify-center border transition-colors max-md:hidden {trigger === 'chevron'
				? '-ml-px h-11 w-[26px] rounded-r-[10px]'
				: 'size-[30px] rounded-[8px]'} {look}"
			aria-label={title}
			{title}
		>
			<MeetIcon name={trigger === 'chevron' ? 'chevron-up' : 'settings'} class={trigger === 'chevron' ? 'size-3.5' : 'size-4'} />
		</Menu.Trigger>
		<Portal>
			<Menu.Positioner>
				<Menu.Content class="z-menu z-40 w-[292px]">
					{#each kinds as kind (kind)}
						{@render devicePicks(kind)}
					{/each}
					{#if kinds.includes('audioinput')}
						<div class="mx-1.5 my-1 h-px bg-[var(--z-hairline)]"></div>
						<Menu.CheckboxItem
							value="noise"
							class="z-menu-item justify-between"
							checked={noiseSuppression}
							closeOnSelect={false}
							onCheckedChange={setNoiseSuppression}
						>
							Noise suppression
							<span class="hobday-checkbox" data-checked={noiseSuppression} aria-hidden="true"></span>
						</Menu.CheckboxItem>
					{/if}
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</Menu.Root>
{/snippet}

{#snippet moreItem(value: string, icon: MeetIconName, text: string, act: () => void, disabled = false)}
	<Menu.Item {value} class="z-menu-item" {disabled} onSelect={act}>
		<span class="text-[var(--z-soft)]"><MeetIcon name={icon} /></span>{text}
	</Menu.Item>
{/snippet}

<div class="z-screen flex flex-col overflow-hidden bg-[var(--z-ground)] text-[var(--z-ink)]">
	<div class="hidden">
		{#each sounds as sound (sound.sid)}
			<MeetMedia track={sound} />
		{/each}
	</div>

	<header class="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[var(--z-hairline)] bg-[var(--z-surface)] px-3.5 max-md:px-3">
		<div class="flex min-w-0 items-center gap-3 max-md:gap-2">
			<span class="btn-tactile !size-8 !cursor-default !p-0 max-md:hidden" aria-hidden="true">
				<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none"><path d="M3 3H13L3 13H13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" /></svg>
			</span>
			<span class="h-4 w-px bg-[var(--z-line)] max-md:hidden"></span>
			<h1 class="truncate text-[14px] font-semibold">Zaur Meet</h1>
			{#if startedAt}
				<span class="z-mono inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--z-line)] bg-[var(--z-sunken)] px-2 text-[11.5px] font-semibold text-[var(--z-strong)]">
					<span class="size-[7px] rounded-full {statusLine.dot}"></span>
					{formatElapsed(now - startedAt)}
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<button type="button" class="btn-tactile !text-[12.5px] !font-semibold max-md:hidden" onclick={copyLink}>
				<MeetIcon name={copied ? 'check' : 'link'} />
				{copied ? 'Copied' : 'Copy link'}
			</button>
			<div role="group" aria-label="Layout" class="flex items-center rounded-[8px] border border-[var(--z-line)] bg-[var(--z-sunken)] p-0.5 max-md:hidden">
				{#each [['grid', 'Grid'], ['speaker', 'Speaker']] as const as [value, title] (value)}
					{@const on = (value === 'speaker') === speakerView}
					<button
						type="button"
						class="inline-flex h-[26px] w-7 cursor-pointer items-center justify-center rounded-[6px] border {on
							? ON
							: 'border-transparent text-[var(--z-soft)] hover:text-[var(--z-strong)]'}"
						aria-pressed={on}
						aria-label={title}
						{title}
						onclick={() => (view = value)}
					>
						<MeetIcon name={value} />
					</button>
				{/each}
			</div>
			<button
				type="button"
				class="inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[8px] border px-2.5 max-md:h-8 {panelOpen ? ON : PLAIN}"
				aria-pressed={panelOpen}
				title="People (p)"
				aria-label="People"
				onclick={() => (panelOpen = !panelOpen)}
			>
				<MeetIcon name="people" />
				<span class="z-mono text-[11px] font-semibold">{people.length || 1}</span>
			</button>
			{@render deviceMenu(
				canPickSpeaker ? ['videoinput', 'audioinput', 'audiooutput'] : ['videoinput', 'audioinput'],
				'Settings',
				'settings',
				PLAIN
			)}
		</div>
	</header>

	<div class="flex min-h-0 flex-1">
		<main class="relative min-w-0 flex-1 overflow-hidden" bind:clientWidth={stageW} bind:clientHeight={stageH}>
			{#if status === 'connecting' || !me}
				<div class="absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-center">
					<span class="flex size-10 animate-pulse items-center justify-center rounded-full border {ON}"><MeetIcon name="cam" /></span>
					<div>
						<div class="text-[15px] font-semibold">Joining…</div>
						<div class="z-mono mt-1 text-[11px] text-[var(--z-soft)]">
							mic {choice.micOn ? 'on' : 'off'} · camera {choice.camOn ? 'on' : 'off'}
						</div>
					</div>
				</div>
			{:else if layout === 'focus'}
				<!-- Speaker view: the shared screen, else whoever spoke last; everyone else in a strip. -->
				<div class="absolute flex gap-3 max-md:flex-col" style:inset="{pad}px">
					<div class="min-h-0 min-w-0 flex-1">
						{#if presenter}{@render screen(presenter)}{:else if featured}{@render tile(featured)}{/if}
					</div>
					<div class="flex shrink-0 gap-2.5 overflow-auto md:w-[176px] md:flex-col max-md:h-[90px]">
						{#each presenter ? people : people.filter((p) => p !== featured) as p (p.sid)}
							<div class="aspect-[16/10] w-[176px] shrink-0 max-md:h-full max-md:w-auto">{@render tile(p, true)}</div>
						{/each}
					</div>
				</div>
			{:else if layout === 'pair'}
				{@const other = people.find((p) => !p.isLocal)}
				{#if other}
					<div class="absolute" style:inset="{pad}px">{@render tile(other)}</div>
				{/if}
				<div class="absolute z-[2] h-[130px] w-[208px] max-md:h-[132px] max-md:w-[96px]" style:right="{pad + 12}px" style:bottom="{pad + 12}px">
					{@render tile(me, true)}
				</div>
			{:else if layout === 'grid'}
				<div class="absolute flex items-center justify-center" style:inset="{pad}px">
					<div class="flex flex-wrap justify-center gap-3" style:width="{grid.cols * grid.w + (grid.cols - 1) * 12}px">
						{#if presenter}
							<div style:width="{grid.w}px" style:height="{grid.h}px">{@render screen(presenter)}</div>
						{/if}
						{#each people as p (p.sid)}
							<div style:width="{grid.w}px" style:height="{grid.h}px">{@render tile(p)}</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="absolute flex flex-col items-center justify-center gap-3.5 overflow-y-auto" style:inset="{pad}px">
					<div class="aspect-[16/10] w-full max-w-[560px] shrink-0">{@render tile(me)}</div>
					<div class="w-full max-w-[560px] rounded-[12px] border border-[var(--z-line)] bg-[var(--z-surface)] px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
						<div class="text-[15px] font-semibold">You're the first one here</div>
						<p class="mt-1 text-[13px] leading-[1.55] text-[var(--z-muted)]">
							Anyone with the link can join. Guests type a name; people with a Zaur account join as themselves.
						</p>
						<div class="mt-3 flex gap-2 max-md:flex-col">
							{@render linkRow()}
							{@render emailInvite()}
						</div>
					</div>
				</div>
			{/if}

			{#if status === 'reconnecting'}
				<div class="absolute inset-x-3.5 top-3.5 z-10 flex gap-2.5 rounded-[9px] border px-3 py-2.5 {NEEDS}" role="status">
					<span class="pt-px"><MeetIcon name="refresh" /></span>
					<div>
						<div class="text-[13px] font-semibold">Connection dropped — reconnecting</div>
						<div class="mt-0.5 text-[12px] leading-[1.45] opacity-85">Video is paused. Your mic and camera stay as you left them.</div>
					</div>
				</div>
			{/if}

			{#if playbackBlocked && status === 'live'}
				<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center">
					<button type="button" class="btn-tactile btn-primary !h-10 !px-4 !text-[13.5px]" onclick={resumePlayback}>
						<MeetIcon name="volume" /> Start sound and video
					</button>
					<p class="max-w-[260px] text-[12.5px] leading-normal text-[var(--z-body)]">Your browser held back autoplay. One tap starts both.</p>
				</div>
			{/if}

			{#if notice}
				<div
					class="absolute inset-x-0 bottom-4 z-10 mx-auto flex w-[min(440px,calc(100%-28px))] items-center gap-2.5 rounded-[9px] border py-2 pr-2 pl-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)] {OFF}"
					role="alert"
				>
					<MeetIcon name="alert" />
					<div class="min-w-0 flex-1 text-[12.5px] font-semibold">{notice.text}</div>
					{#if notice.retry}
						<button type="button" class="h-[26px] shrink-0 cursor-pointer rounded-[6px] border border-[var(--z-ch-discard-stroke)] bg-[var(--z-surface)] px-2.5 text-[12px] font-semibold" onclick={notice.retry}>
							Try again
						</button>
					{/if}
					<button type="button" class="flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[6px]" aria-label="Dismiss" onclick={() => (notice = null)}>
						<MeetIcon name="close" class="size-3.5" />
					</button>
				</div>
			{/if}
		</main>

		{#if panelOpen}
			<button type="button" class="fixed inset-0 z-20 bg-black/50 md:hidden" aria-label="Close people" onclick={() => (panelOpen = false)}></button>
			<aside
				aria-label="People"
				class="flex w-[300px] shrink-0 flex-col border-l border-[var(--z-hairline)] bg-[var(--z-surface)] max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:h-[70%] max-md:w-auto max-md:rounded-t-2xl max-md:border-t max-md:border-l-0 max-md:border-[var(--z-line)] max-md:shadow-[0_-12px_32px_rgba(0,0,0,0.45)]"
			>
				<span class="mx-auto mt-2 h-1 w-9 rounded-full bg-[var(--z-line)] md:hidden"></span>
				<div class="flex h-12 shrink-0 items-center justify-between border-b border-[var(--z-hairline)] pr-2.5 pl-4 max-md:border-0">
					<div class="flex items-center gap-2">
						<span class="text-[14px] font-semibold max-md:text-[16px]">People</span>
						<span class="z-kbd">{people.length}</span>
					</div>
					<button type="button" class="z-icon-btn !size-7 max-md:!size-9" title="Close (p)" aria-label="Close people" onclick={() => (panelOpen = false)}>
						<MeetIcon name="close" />
					</button>
				</div>
				<div class="shrink-0 border-b border-[var(--z-hairline)] px-4 pt-3.5 pb-4 max-md:pt-0">
					<div class="text-[12.5px] text-[var(--z-soft)] max-md:hidden">Invite people</div>
					<div class="mt-2 flex max-md:mt-0">{@render linkRow(true)}</div>
					{#if invite}
						<div class="mt-2">{@render emailInvite(true)}</div>
						<p class="mt-1.5 text-[11.5px] leading-[1.45] text-[var(--z-soft)]">Opens a new message in Mail with the link.</p>
					{/if}
				</div>
				<div class="min-h-0 flex-1 overflow-y-auto px-2 py-3">
					<div class="px-2 pb-1.5 text-[12.5px] text-[var(--z-soft)]">In the call</div>
					<ul class="flex flex-col gap-0.5">
						{#each roster as p (p.sid)}
							<li
								class="relative flex items-center gap-2.5 rounded-[8px] py-[7px] pr-2 pl-4 max-md:py-[9px] {p.speaking
									? 'bg-[color-mix(in_oklab,var(--z-ch-confirmed-stroke)_12%,var(--z-surface))]'
									: ''}"
							>
								<span class="absolute inset-y-2 left-1.5 w-[3px] rounded-full bg-[var(--z-ch-confirmed-stroke)] {p.speaking ? '' : 'opacity-0'}"></span>
								<span class="z-avatar !size-7 !rounded-[7px] !text-[10.5px] max-md:!size-8" style={identityStyle(seed(p))}>{initials(p.name, '')}</span>
								<div class="min-w-0 flex-1">
									<div class="truncate text-[13.5px] max-md:text-[14.5px] {p.speaking ? 'font-semibold' : 'font-medium'}">{p.name}</div>
									<div
										class="truncate text-[11.5px] max-md:text-[12.5px] {p === presenter
											? 'text-[var(--z-ch-correspondence-ink)]'
											: p.handSince
												? 'text-[var(--z-ch-needs-ink)]'
												: 'text-[var(--z-soft)]'} {!p.isLocal && !p.guest && p !== presenter && !p.handSince ? 'z-mono' : ''}"
									>
										{subline(p)}
									</div>
								</div>
								{#if p.handSince}
									<span class="size-6 justify-center {CHIP} {NEEDS}" title="Hand raised"><MeetIcon name="hand" class="size-3.5" /></span>
								{/if}
								{#if !p.micOn}
									<span class="text-[var(--z-ch-discard-stroke)]" title="Muted"><MeetIcon name="mic-off" /></span>
								{:else if p.speaking}
									<span class="px-[3px]" title="Speaking">{@render bars(13)}</span>
								{:else}
									<span class="text-[var(--z-faint)]"><MeetIcon name="mic" /></span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			</aside>
		{/if}
	</div>

	<!-- Status | controls | Leave; on a phone, one evenly spaced row of icons. -->
	<footer
		class="grid h-[76px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[var(--z-hairline)] bg-[var(--z-canvas)] px-4 max-md:flex max-md:h-[84px] max-md:justify-between max-md:pb-2"
	>
		<div class="flex min-w-0 flex-col gap-0.5 max-lg:invisible max-md:hidden">
			<div class="flex items-center gap-[7px] text-[12.5px] text-[var(--z-strong)]">
				<span class="size-[7px] rounded-full {statusLine.dot}"></span>{statusLine.text}
			</div>
			<div class="z-mono text-[10.5px] text-[var(--z-soft)]">m mic · v camera · h hand · p people</div>
		</div>

		<div class="flex items-center gap-2 max-md:contents">
			<div class="flex">
				<button
					type="button"
					class="{CTRL} rounded-l-[10px] {micOn ? PLAIN : OFF}"
					aria-pressed={!micOn}
					title={micOn ? 'Mute microphone (m)' : 'Unmute microphone (m)'}
					disabled={status === 'connecting'}
					onclick={toggleMic}
				>
					<MeetIcon name={micOn ? 'mic' : 'mic-off'} />
					<span class="max-md:sr-only">Mic</span>
				</button>
				{@render deviceMenu(canPickSpeaker ? ['audioinput', 'audiooutput'] : ['audioinput'], 'Microphone and speakers', 'chevron', micOn ? PLAIN : OFF)}
			</div>
			<div class="flex">
				<button
					type="button"
					class="{CTRL} rounded-l-[10px] {camOn ? PLAIN : OFF}"
					aria-pressed={!camOn}
					title={camOn ? 'Turn camera off (v)' : 'Turn camera on (v)'}
					disabled={status === 'connecting'}
					onclick={toggleCam}
				>
					<MeetIcon name={camOn ? 'cam' : 'cam-off'} />
					<span class="max-md:sr-only">Camera</span>
				</button>
				{@render deviceMenu(['videoinput'], 'Choose a camera', 'chevron', camOn ? PLAIN : OFF)}
			</div>
			{#if canShare}
				<button
					type="button"
					class="{CTRL} rounded-[10px] max-md:hidden {sharing ? ON : PLAIN}"
					aria-pressed={sharing}
					title={sharing ? 'Stop sharing' : 'Share your screen'}
					disabled={status === 'connecting'}
					onclick={toggleShare}
				>
					<MeetIcon name="share" />
					<span class="max-md:sr-only">{sharing ? 'Stop sharing' : 'Share screen'}</span>
				</button>
			{/if}
			<button
				type="button"
				class="{CTRL} rounded-[10px] {handUp ? NEEDS : PLAIN}"
				aria-pressed={handUp}
				title={handUp ? 'Lower hand (h)' : 'Raise hand (h)'}
				disabled={status === 'connecting'}
				onclick={toggleHand}
			>
				<MeetIcon name="hand" />
				<span class="max-md:sr-only">{handUp ? 'Lower hand' : 'Raise hand'}</span>
			</button>
			<!-- A phone's fifth control: Share, which does not fit the bar, and what only a phone has. -->
			{#if canShare || canPickSpeaker || cameras > 1}
				<Menu.Root
					positioning={{ placement: 'top-end', gutter: 8, overflowPadding: 12 }}
					lazyMount
					unmountOnExit
					onOpenChange={(details) => details.open && loadDevices()}
				>
					<Menu.Trigger
						class="{CTRL} rounded-[10px] md:hidden {PLAIN}"
						aria-label="More"
						title="More: switch camera, speaker, share"
						disabled={status === 'connecting'}
					>
						<MeetIcon name="more" />
					</Menu.Trigger>
					<Portal>
						<Menu.Positioner>
							<Menu.Content class="z-menu z-40 w-[260px]">
								{#if canShare}
									{@render moreItem('share', 'share', sharing ? 'Stop sharing' : 'Share screen', toggleShare)}
								{/if}
								{#if cameras > 1}
									{@render moreItem('flip', 'refresh', facing === 'user' ? 'Use the back camera' : 'Use the front camera', flipCamera, !camOn)}
								{/if}
								{#if canPickSpeaker}
									{@render devicePicks('audiooutput')}
								{/if}
							</Menu.Content>
						</Menu.Positioner>
					</Portal>
				</Menu.Root>
			{/if}
		</div>

		<div class="flex justify-end">
			<!-- The one filled red control in the suite. -->
			<button
				type="button"
				class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-[#b91c1c] bg-[#dc2626] px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:bg-[#b91c1c] max-md:h-[52px] max-md:w-16 max-md:justify-center max-md:rounded-[14px] max-md:px-0"
				title="Leave the call"
				onclick={leave}
			>
				<MeetIcon name="leave" class="size-4 max-md:size-5" />
				<span class="max-md:sr-only">Leave</span>
			</button>
		</div>
	</footer>
</div>
