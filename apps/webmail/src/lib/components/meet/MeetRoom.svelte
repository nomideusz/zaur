<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		LocalParticipant,
		LocalTrackPublication,
		Participant,
		RemoteParticipant,
		RemoteTrack,
		RemoteTrackPublication,
		Room,
		ScreenShareCaptureOptions,
		Track as LKTrack,
		TrackPublication
	} from 'livekit-client';
	import RiCloseLine from 'svelte-remixicon/RiCloseLine.svelte';
	import RiMicLine from 'svelte-remixicon/RiMicLine.svelte';
	import RiMicOffLine from 'svelte-remixicon/RiMicOffLine.svelte';
	import RiShareLine from 'svelte-remixicon/RiShareLine.svelte';
	import RiVideoLine from 'svelte-remixicon/RiVideoLine.svelte';
	import RiVideoOffLine from 'svelte-remixicon/RiVideoOffLine.svelte';
	import { cn } from '$lib/utils/cn';
	import { isSafariUserAgent } from '$lib/utils/meet';

	type Tile = {
		id: string;
		name: string;
		isLocal: boolean;
		isScreen: boolean;
		track: LKTrack;
	};

	let {
		wsUrl,
		token,
		displayName
	}: {
		wsUrl: string;
		token: string;
		displayName: string;
	} = $props();

	let status = $state<'connecting' | 'live' | 'error' | 'left'>('connecting');
	let errorMessage = $state('');
	let micOn = $state(false);
	let camOn = $state(false);
	let sharing = $state(false);
	let playbackBlocked = $state(false);
	let notice = $state('');
	let remoteCount = $state(0);
	let linkState = $state('');
	let canShare = $state(false);
	let tiles = $state<Tile[]>([]);
	let audios = $state<{ id: string; track: LKTrack }[]>([]);
	let room = $state<Room | null>(null);

	const hasLocalVideo = $derived(tiles.some((tile) => tile.isLocal && !tile.isScreen));
	const hasRemoteVideo = $derived(tiles.some((tile) => !tile.isLocal));
	const hasScreen = $derived(tiles.some((tile) => tile.isScreen));
	/**
	 * Who is in the room, not who is sending video. Keying the empty state off
	 * video tiles claimed nobody had joined whenever a peer had their camera off
	 * — or whenever their media never reached us.
	 */
	const roomState = $derived(
		remoteCount === 0
			? 'Waiting for others'
			: hasRemoteVideo
				? ''
				: `${remoteCount} other${remoteCount === 1 ? '' : 's'} in the call, no video yet`
	);
	// A screen share is what everyone is there to look at — put it first and big.
	const ordered = $derived([...tiles].sort((a, b) => Number(b.isScreen) - Number(a.isScreen)));
	const stageCount = $derived(tiles.length + (hasLocalVideo ? 0 : 1));
	const initials = $derived(
		displayName
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);

	/**
	 * Hand the element straight to LiveKit. `attach(el)` sets `muted`, `autoplay`
	 * and `playsInline` itself, per-browser — never override them afterwards,
	 * that is what black-screened Android.
	 */
	function attachTrack(track: LKTrack) {
		return (node: HTMLMediaElement) => {
			track.attach(node);
			return () => track.detach(node);
		};
	}

	function leave() {
		void room?.disconnect();
		status = 'left';
		if (window.opener) {
			window.close();
			return;
		}
		window.location.href = '/calendar';
	}

	async function resumePlayback() {
		if (!room) return;
		await Promise.allSettled([room.startAudio(), room.startVideo()]);
		playbackBlocked = !room.canPlaybackAudio || !room.canPlaybackVideo;
	}

	onMount(() => {
		let cancelled = false;

		void (async () => {
			const { Room, RoomEvent, Track } = await import('livekit-client');
			if (cancelled) return;

			function tileId(participant: Participant, publication: TrackPublication): string {
				return `${participant.sid}:${publication.trackSid}`;
			}

			function labelOf(participant: Participant): string {
				return participant.name?.trim() || participant.identity;
			}

			function upsert(participant: Participant, publication: TrackPublication, isLocal: boolean) {
				const track = publication.track;
				if (publication.kind !== Track.Kind.Video || !track) return;
				const id = tileId(participant, publication);
				const next: Tile = {
					id,
					name: isLocal ? displayName || labelOf(participant) : labelOf(participant),
					isLocal,
					isScreen: publication.source === Track.Source.ScreenShare,
					track
				};
				tiles = [...tiles.filter((tile) => tile.id !== id), next];
			}

			function drop(participant: Participant, publication: TrackPublication) {
				const id = tileId(participant, publication);
				tiles = tiles.filter((tile) => tile.id !== id);
			}

			const nextRoom = new Room({ adaptiveStream: true, dynacast: true });
			nextRoom
				.on(
					RoomEvent.TrackSubscribed,
					(
						track: RemoteTrack,
						publication: RemoteTrackPublication,
						participant: RemoteParticipant
					) => {
						if (track.kind === Track.Kind.Audio) {
							const id = tileId(participant, publication);
							audios = [...audios.filter((a) => a.id !== id), { id, track }];
							return;
						}
						upsert(participant, publication, false);
					}
				)
				.on(
					RoomEvent.TrackUnsubscribed,
					(
						track: RemoteTrack,
						publication: RemoteTrackPublication,
						participant: RemoteParticipant
					) => {
						if (track.kind === Track.Kind.Audio) {
							const id = tileId(participant, publication);
							audios = audios.filter((a) => a.id !== id);
							return;
						}
						drop(participant, publication);
					}
				)
				.on(
					RoomEvent.LocalTrackPublished,
					(publication: LocalTrackPublication, participant: LocalParticipant) => {
						upsert(participant, publication, true);
						syncLocal();
					}
				)
				.on(
					RoomEvent.LocalTrackUnpublished,
					(publication: LocalTrackPublication, participant: LocalParticipant) => {
						drop(participant, publication);
						syncLocal();
					}
				)
				// Screen share is usually stopped from the browser's own bar, and the
				// camera can be revoked from the OS. Read the real state back rather
				// than trusting our toggles, or the next click just re-syncs and the
				// button looks dead.
				.on(RoomEvent.TrackMuted, syncLocal)
				.on(RoomEvent.TrackUnmuted, syncLocal)
				// Android blocks autoplay far more often than iOS; offer a tap to resume.
				.on(RoomEvent.AudioPlaybackStatusChanged, () => {
					playbackBlocked = !nextRoom.canPlaybackAudio || !nextRoom.canPlaybackVideo;
				})
				.on(RoomEvent.VideoPlaybackStatusChanged, () => {
					playbackBlocked = !nextRoom.canPlaybackAudio || !nextRoom.canPlaybackVideo;
				})
				.on(RoomEvent.ParticipantConnected, () => {
					remoteCount = nextRoom.remoteParticipants.size;
				})
				.on(RoomEvent.ParticipantDisconnected, () => {
					remoteCount = nextRoom.remoteParticipants.size;
				})
				// Signalling is a websocket and almost always connects; media is a
				// separate transport that can fail on its own. Say which one is down
				// instead of silently showing an empty room.
				.on(RoomEvent.ConnectionStateChanged, (state) => {
					linkState = state === 'connected' ? '' : `Connection: ${state}`;
				})
				.on(RoomEvent.MediaDevicesError, (err: Error) => {
					notice = err.message;
				})
				.on(RoomEvent.Disconnected, () => {
					if (!cancelled && status !== 'left') status = 'left';
				});

			room = nextRoom;
			try {
				await nextRoom.connect(wsUrl, token);
				if (cancelled) {
					await nextRoom.disconnect();
					return;
				}
				remoteCount = nextRoom.remoteParticipants.size;
				// iOS and iPadOS Safari have no getDisplayMedia at all — feature-detect
				// rather than guessing from pointer type, which hid the button on
				// touchscreen laptops and showed it where it could never work.
				canShare = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
				await setLocalDevice(nextRoom, 'microphone', true);
				await setLocalDevice(nextRoom, 'camera', true);
				status = 'live';
			} catch (err) {
				errorMessage = err instanceof Error ? err.message : 'Could not join the call';
				status = 'error';
			}
		})();

		return () => {
			cancelled = true;
			void room?.disconnect();
		};
	});

	/** Read the toggles back off the room; never infer them from our own clicks. */
	function syncLocal() {
		const me = room?.localParticipant;
		if (!me) return;
		micOn = me.isMicrophoneEnabled;
		camOn = me.isCameraEnabled;
		sharing = me.isScreenShareEnabled;
	}

	/**
	 * WebKit captures at a uselessly low resolution — or fails outright — when
	 * getDisplayMedia is given width/height constraints (webkit.org/show_bug.cgi?id=263015).
	 * livekit-client guards for this, but its `isSafari17Based()` only matches a
	 * literal "17." on desktop, so Safari 18+ gets capped anyway. Passing a zeroed
	 * resolution is the SDK's documented "uncapped" escape hatch.
	 */
	function screenShareOptions(): ScreenShareCaptureOptions | undefined {
		return isSafariUserAgent(navigator.userAgent)
			? { resolution: { width: 0, height: 0, frameRate: 30 } }
			: undefined;
	}

	async function setLocalDevice(
		target: Room,
		kind: 'microphone' | 'camera' | 'screen',
		enabled: boolean
	): Promise<void> {
		notice = '';
		try {
			if (kind === 'microphone') await target.localParticipant.setMicrophoneEnabled(enabled);
			// Phones default to whichever camera the OS lists first — usually the rear one.
			else if (kind === 'camera')
				await target.localParticipant.setCameraEnabled(enabled, { facingMode: 'user' });
			// Must stay in the click's task: Safari drops the user gesture across an await.
			else await target.localParticipant.setScreenShareEnabled(enabled, screenShareOptions());
		} catch (err) {
			// A dead-looking button with no explanation is worse than the failure.
			if (!isUserCancelled(err)) {
				notice = err instanceof Error ? err.message : `Could not turn ${kind} ${enabled ? 'on' : 'off'}`;
			}
		}
		syncLocal();
	}

	function isUserCancelled(err: unknown): boolean {
		return err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError');
	}

	async function toggleMic() {
		if (!room) return;
		await setLocalDevice(room, 'microphone', !micOn);
	}

	async function toggleCam() {
		if (!room) return;
		await setLocalDevice(room, 'camera', !camOn);
	}

	function toggleShare() {
		if (!room) return;
		// Not awaited and not async: keeps getDisplayMedia inside the user gesture.
		void setLocalDevice(room, 'screen', !sharing);
	}
</script>

<div class="z-meet">
	<div class="sr-only">
		{#each audios as audio (audio.id)}
			<audio {@attach attachTrack(audio.track)}></audio>
		{/each}
	</div>

	<div class="z-meet__stage">
		<p class="z-meet__brand">Zaur Meet</p>

		{#if status === 'connecting'}
			<p class="z-meet__status">Joining…</p>
		{:else if status === 'error'}
			<div class="z-meet__status">
				<p>{errorMessage}</p>
				<button type="button" class="z-btn-primary mt-4" onclick={() => window.location.reload()}>
					Try again
				</button>
			</div>
		{:else if status === 'left'}
			<p class="z-meet__status">You left the call.</p>
		{:else}
			<div
				class={cn(
					'z-meet__grid',
					hasScreen && 'z-meet__grid--focus',
					!hasScreen && stageCount <= 1 && 'z-meet__grid--solo',
					!hasScreen && stageCount === 2 && 'z-meet__grid--pair'
				)}
			>
				{#each ordered as tile (tile.id)}
					<div
						class={cn(
							'z-meet-tile',
							tile.isScreen && 'z-meet-tile--screen',
							tile.isLocal && !tile.isScreen && 'z-meet-tile--mirror'
						)}
					>
						<video class="z-meet-tile__video" {@attach attachTrack(tile.track)}></video>
						<p class="z-meet-tile__name">
							{tile.name}{tile.isLocal ? ' (you)' : ''}{tile.isScreen ? ' · screen' : ''}
						</p>
					</div>
				{/each}
				{#if !hasLocalVideo}
					<div class="z-meet-tile">
						<div class="z-meet-tile__placeholder" aria-hidden="true">{initials}</div>
						<p class="z-meet-tile__name">{displayName} (you)</p>
					</div>
				{/if}
			</div>
			{#if roomState || linkState}
				<p class="z-meet__waiting">{linkState || roomState}</p>
			{/if}
		{/if}
	</div>

	{#if status === 'live'}
		<div class="z-meet__bar">
			{#if playbackBlocked}
				<button type="button" class="z-meet__resume" onclick={() => void resumePlayback()}>
					Tap to start video and sound
				</button>
			{:else if notice}
				<p class="z-meet__notice" role="status">{notice}</p>
			{/if}
			<div class="z-meet__ctrls">
				<button
					type="button"
					class={cn('z-meet__ctrl', !micOn && 'z-meet__ctrl--off')}
					aria-pressed={micOn}
					aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
					onclick={() => void toggleMic()}
				>
					{#if micOn}
						<RiMicLine class="size-5" />
					{:else}
						<RiMicOffLine class="size-5" />
					{/if}
				</button>
				<button
					type="button"
					class={cn('z-meet__ctrl', !camOn && 'z-meet__ctrl--off')}
					aria-pressed={camOn}
					aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
					onclick={() => void toggleCam()}
				>
					{#if camOn}
						<RiVideoLine class="size-5" />
					{:else}
						<RiVideoOffLine class="size-5" />
					{/if}
				</button>
				{#if canShare}
					<button
						type="button"
						class={cn('z-meet__ctrl', sharing && 'z-meet__ctrl--on')}
						aria-pressed={sharing}
						aria-label={sharing ? 'Stop sharing screen' : 'Share screen'}
						onclick={toggleShare}
					>
						<RiShareLine class="size-5" />
					</button>
				{/if}
				<button
					type="button"
					class="z-meet__ctrl z-meet__ctrl--leave"
					aria-label="Leave call"
					onclick={leave}
				>
					<RiCloseLine class="size-5" />
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(html:has(.z-meet)),
	:global(body:has(.z-meet)) {
		background: #111;
		/* The stage scrolls, not the document — otherwise the control bar drifts
		   off-screen behind Android's collapsing browser chrome. */
		overflow: hidden;
		overscroll-behavior: none;
	}

	.z-meet {
		--z-meet-bg: #111;
		--z-meet-tile: #1c1c1c;
		--z-meet-ctrl: #2a2a2a;
		--z-meet-ctrl-hover: #3d3d3d;
		--z-meet-fg: #ededec;
		--z-meet-muted: #a8a8a6;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		height: 100dvh;
		overflow: hidden;
		color-scheme: dark;
		background: var(--z-meet-bg);
		color: var(--z-meet-fg);
	}

	.z-meet__stage {
		position: relative;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}

	.z-meet__brand {
		position: absolute;
		top: calc(0.75rem + env(safe-area-inset-top, 0px));
		left: calc(0.75rem + env(safe-area-inset-left, 0px));
		z-index: 2;
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 650;
		letter-spacing: -0.03em;
		color: color-mix(in srgb, var(--z-meet-muted) 72%, transparent);
		pointer-events: none;
		user-select: none;
	}

	.z-meet__status {
		display: grid;
		place-content: center;
		padding: 2rem;
		text-align: center;
		color: var(--z-meet-muted);
	}

	.z-meet__grid {
		display: grid;
		gap: 0.5rem;
		padding: 0.5rem;
		align-content: center;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
	}

	/* One tile fills the stage; two stack on phones and sit side by side above it. */
	.z-meet__grid--solo,
	.z-meet__grid--pair {
		grid-template-columns: 1fr;
		max-width: 56rem;
		margin-inline: auto;
		width: 100%;
	}

	@media (min-width: 48rem) {
		.z-meet__grid--pair {
			grid-template-columns: 1fr 1fr;
		}
	}

	/* Someone is sharing: the share gets the room, faces drop to a thumbnail strip. */
	.z-meet__grid--focus {
		grid-template-columns: repeat(auto-fit, minmax(min(50% - 0.25rem, 8rem), 1fr));
	}

	.z-meet__grid--focus .z-meet-tile--screen {
		grid-column: 1 / -1;
		aspect-ratio: 16 / 9;
	}

	.z-meet-tile {
		position: relative;
		overflow: hidden;
		border-radius: 0.75rem;
		background: var(--z-meet-tile);
		/* aspect-ratio, not min-height: tiles can never outgrow the viewport. */
		aspect-ratio: 4 / 3;
	}

	.z-meet__grid--solo .z-meet-tile {
		aspect-ratio: auto;
		height: 100%;
		min-height: min(60dvh, 32rem);
	}

	.z-meet-tile__placeholder {
		display: grid;
		place-items: center;
		height: 100%;
		font-size: clamp(2rem, 12vw, 3rem);
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--z-meet-muted);
	}

	.z-meet-tile__video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		background: #111;
	}

	.z-meet-tile--mirror .z-meet-tile__video {
		transform: scaleX(-1);
	}

	/* Never crop a shared screen — letterbox it. */
	.z-meet-tile--screen .z-meet-tile__video {
		object-fit: contain;
		background: #000;
	}

	.z-meet-tile__name {
		position: absolute;
		left: 0.5rem;
		bottom: 0.5rem;
		margin: 0;
		padding: 0.2rem 0.5rem;
		border-radius: 0.375rem;
		background: color-mix(in srgb, black 55%, transparent);
		color: var(--z-meet-fg);
		font-size: 0.75rem;
	}

	.z-meet__waiting {
		margin: 0;
		padding: 0.5rem 0.75rem;
		text-align: center;
		color: var(--z-meet-muted);
		font-size: 0.875rem;
	}

	.z-meet__bar {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
		background: var(--z-meet-bg);
		border-top: 1px solid #262626;
	}

	.z-meet__ctrls {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	.z-meet__notice {
		margin: 0;
		max-width: 32rem;
		text-align: center;
		font-size: 0.8125rem;
		color: var(--z-danger, #e0706d);
	}

	.z-meet__resume {
		padding: 0.5rem 0.875rem;
		border: 0;
		border-radius: 9999px;
		background: var(--z-accent);
		color: var(--z-accent-fg, white);
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.z-meet__ctrl {
		display: grid;
		place-items: center;
		/* 44px min touch target. */
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid #3f3f3f;
		border-radius: 9999px;
		background: var(--z-meet-ctrl);
		color: var(--z-meet-fg);
		cursor: pointer;
	}

	.z-meet__ctrl:hover,
	.z-meet__ctrl:focus-visible {
		background: var(--z-meet-ctrl-hover);
	}

	.z-meet__ctrl--off,
	.z-meet__ctrl--leave {
		background: color-mix(in srgb, var(--z-danger, #c03734) 85%, black);
		border-color: transparent;
		color: white;
	}

	.z-meet__ctrl--off:hover,
	.z-meet__ctrl--off:focus-visible,
	.z-meet__ctrl--leave:hover,
	.z-meet__ctrl--leave:focus-visible {
		background: color-mix(in srgb, var(--z-danger, #c03734) 70%, black);
	}

	.z-meet__ctrl--on {
		background: var(--z-accent);
		border-color: transparent;
		color: var(--z-accent-fg, white);
	}

	.z-meet__ctrl--on:hover,
	.z-meet__ctrl--on:focus-visible {
		background: var(--z-accent-hover, var(--z-accent));
	}
</style>
