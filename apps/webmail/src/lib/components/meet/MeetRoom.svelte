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
		TrackPublication
	} from 'livekit-client';
	import RiCloseLine from 'svelte-remixicon/RiCloseLine.svelte';
	import RiMicLine from 'svelte-remixicon/RiMicLine.svelte';
	import RiMicOffLine from 'svelte-remixicon/RiMicOffLine.svelte';
	import RiShareLine from 'svelte-remixicon/RiShareLine.svelte';
	import RiVideoLine from 'svelte-remixicon/RiVideoLine.svelte';
	import RiVideoOffLine from 'svelte-remixicon/RiVideoOffLine.svelte';
	import { cn } from '$lib/utils/cn';

	type Tile = {
		id: string;
		identity: string;
		name: string;
		isLocal: boolean;
		isScreen: boolean;
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
	let tiles = $state<Tile[]>([]);
	let audioHost = $state<HTMLDivElement | null>(null);
	let room = $state<Room | null>(null);

	const media = new Map<string, HTMLMediaElement>();

	function videoHost(node: HTMLDivElement, id: string) {
		const attach = (tileId: string) => {
			const el = media.get(tileId);
			if (el && el.parentElement !== node) node.appendChild(el);
		};
		attach(id);
		return {
			update(nextId: string) {
				attach(nextId);
			}
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
				if (publication.kind !== Track.Kind.Video || !publication.track) return;
				const id = tileId(participant, publication);
				const el = publication.track.attach();
				if (el instanceof HTMLVideoElement) el.playsInline = true;
				el.autoplay = true;
				el.muted = isLocal;
				el.className = 'z-meet-tile__video';
				media.get(id)?.remove();
				media.set(id, el);
				const next: Tile = {
					id,
					identity: participant.identity,
					name: isLocal ? displayName || labelOf(participant) : labelOf(participant),
					isLocal,
					isScreen: publication.source === Track.Source.ScreenShare
				};
				tiles = [...tiles.filter((tile) => tile.id !== id), next];
				queueMicrotask(() => {
					const host = document.querySelector<HTMLDivElement>(
						`[data-meet-tile="${CSS.escape(id)}"]`
					);
					const el = media.get(id);
					if (host && el && el.parentElement !== host) host.appendChild(el);
				});
			}

			function drop(participant: Participant, publication: TrackPublication) {
				const id = tileId(participant, publication);
				const el = media.get(id);
				if (el) {
					publication.track?.detach(el);
					el.remove();
					media.delete(id);
				}
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
							if (!audioHost) return;
							audioHost.append(track.attach());
							return;
						}
						upsert(participant, publication, false);
					}
				)
				.on(
					RoomEvent.TrackUnsubscribed,
					(
						_track: RemoteTrack,
						publication: RemoteTrackPublication,
						participant: RemoteParticipant
					) => {
						drop(participant, publication);
					}
				)
				.on(
					RoomEvent.LocalTrackPublished,
					(publication: LocalTrackPublication, participant: LocalParticipant) => {
						upsert(participant, publication, true);
					}
				)
				.on(
					RoomEvent.LocalTrackUnpublished,
					(publication: LocalTrackPublication, participant: LocalParticipant) => {
						drop(participant, publication);
					}
				)
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
				micOn = await setLocalDevice(nextRoom, 'microphone', true);
				camOn = await setLocalDevice(nextRoom, 'camera', true);
				status = 'live';
			} catch (err) {
				errorMessage = err instanceof Error ? err.message : 'Could not join the call';
				status = 'error';
			}
		})();

		return () => {
			cancelled = true;
			void room?.disconnect();
			for (const el of media.values()) el.remove();
			media.clear();
		};
	});

	async function setLocalDevice(
		target: Room,
		kind: 'microphone' | 'camera' | 'screen',
		enabled: boolean
	): Promise<boolean> {
		try {
			if (kind === 'microphone') await target.localParticipant.setMicrophoneEnabled(enabled);
			else if (kind === 'camera') await target.localParticipant.setCameraEnabled(enabled);
			else await target.localParticipant.setScreenShareEnabled(enabled);
			return enabled;
		} catch {
			return false;
		}
	}

	async function toggleMic() {
		if (!room) return;
		micOn = await setLocalDevice(room, 'microphone', !micOn);
	}

	async function toggleCam() {
		if (!room) return;
		camOn = await setLocalDevice(room, 'camera', !camOn);
	}

	async function toggleShare() {
		if (!room) return;
		sharing = await setLocalDevice(room, 'screen', !sharing);
	}
</script>

<div class="z-meet">
	<div class="sr-only" bind:this={audioHost}></div>

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
				tiles.length <= 1 && 'z-meet__grid--solo',
				tiles.length === 2 && 'z-meet__grid--pair'
			)}
		>
			{#each tiles as tile (tile.id)}
				<div class="z-meet-tile">
					<div class="z-meet-tile__media" data-meet-tile={tile.id} use:videoHost={tile.id}></div>
					<p class="z-meet-tile__name">
						{tile.name}{tile.isLocal ? ' (you)' : ''}{tile.isScreen ? ' · screen' : ''}
					</p>
				</div>
			{/each}
		</div>
	{/if}

	{#if status === 'live'}
		<div class="z-meet__bar">
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
			<button
				type="button"
				class={cn('z-meet__ctrl', sharing && 'z-meet__ctrl--on')}
				aria-pressed={sharing}
				aria-label={sharing ? 'Stop sharing screen' : 'Share screen'}
				onclick={() => void toggleShare()}
			>
				<RiShareLine class="size-5" />
			</button>
			<button type="button" class="z-meet__ctrl z-meet__ctrl--leave" aria-label="Leave call" onclick={leave}>
				<RiCloseLine class="size-5" />
			</button>
		</div>
	{/if}
</div>

<style>
	.z-meet {
		display: grid;
		grid-template-rows: 1fr auto;
		min-height: 100dvh;
		background: var(--z-surface);
		color: var(--z-fg);
	}

	.z-meet__status {
		display: grid;
		place-items: center;
		padding: 2rem;
		text-align: center;
		color: var(--z-fg-muted);
	}

	.z-meet__grid {
		display: grid;
		gap: 0.5rem;
		padding: 0.75rem;
		align-content: center;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.z-meet__grid--solo,
	.z-meet__grid--pair {
		grid-template-columns: 1fr;
		max-width: 56rem;
		margin-inline: auto;
		width: 100%;
	}

	.z-meet-tile {
		position: relative;
		overflow: hidden;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--z-fg) 8%, var(--z-surface));
		min-height: 12rem;
	}

	.z-meet-tile__media {
		height: 100%;
		min-height: 12rem;
	}

	:global(.z-meet-tile__video) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		background: #111;
	}

	.z-meet-tile__name {
		position: absolute;
		left: 0.75rem;
		bottom: 0.75rem;
		margin: 0;
		padding: 0.2rem 0.5rem;
		border-radius: 0.375rem;
		background: color-mix(in srgb, var(--z-surface) 80%, transparent);
		font-size: 0.8125rem;
	}

	.z-meet__bar {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
	}

	.z-meet__ctrl {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid var(--z-border);
		border-radius: 9999px;
		background: var(--z-surface-raised);
		color: var(--z-fg);
		cursor: pointer;
	}

	.z-meet__ctrl:hover {
		background: var(--z-surface);
	}

	.z-meet__ctrl--off,
	.z-meet__ctrl--leave {
		background: color-mix(in srgb, var(--z-danger, #b42318) 85%, black);
		border-color: transparent;
		color: white;
	}

	.z-meet__ctrl--on {
		background: var(--z-accent);
		border-color: transparent;
		color: var(--z-accent-fg, white);
	}
</style>
