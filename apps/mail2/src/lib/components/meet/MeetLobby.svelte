<script lang="ts" module>
	/** What the lobby hands the room: who you are and what you left on. */
	export interface MediaChoice {
		name: string;
		micOn: boolean;
		camOn: boolean;
		mic?: string;
		cam?: string;
		speaker?: string;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { whoIsHere } from '../../../routes/meet.remote';
	import MeetIcon from './MeetIcon.svelte';
	import { deviceProblem, hereLine } from '#lib/meet/call';
	import { identityStyle } from '#lib/mail/colors';
	import { initials } from '#lib/mail/rows';

	interface Props {
		room: string;
		link: string;
		you: { name: string; email: string } | null;
		here: string[];
		joining: boolean;
		error: string | null;
		onJoin: (choice: MediaChoice) => void;
	}

	let { room, link, you, here, joining, error, onJoin }: Props = $props();

	/**
	 * Webmail dropped you straight into the room with everything on. Here you
	 * see and hear yourself first, and what you switch off stays off when you
	 * join. The preview holds its own tracks and lets them go on the way in;
	 * the room asks for the same devices again.
	 */
	let video = $state<MediaStreamTrack | null>(null);
	let audio = $state<MediaStreamTrack | null>(null);
	let camOn = $state(true);
	let micOn = $state(true);
	let camProblem = $state<string | null>(null);
	let micProblem = $state<string | null>(null);
	let cams = $state<MediaDeviceInfo[]>([]);
	let mics = $state<MediaDeviceInfo[]>([]);
	let speakers = $state<MediaDeviceInfo[]>([]);
	let camId = $state('');
	let micId = $state('');
	let speakerId = $state('');
	let level = $state(0);
	let guestName = $state('');
	let copied = $state(false);
	let preview = $state<HTMLVideoElement>();

	/** Who is in: what the page loaded with, then asked again every ten seconds while the tab is shown. */
	const presence = $derived(browser ? whoIsHere(room) : undefined);
	const inRoom = $derived(presence?.current ?? here);

	onMount(() => {
		const poll = setInterval(() => {
			if (!document.hidden) presence?.refresh().catch(() => {});
		}, 10_000);
		return () => clearInterval(poll);
	});

	const canPickSpeaker = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
	const blocked = $derived([camProblem, micProblem].filter((p): p is string => Boolean(p?.includes('blocked'))));
	const canJoin = $derived(!joining && (you !== null || guestName.trim().length > 0));
	const LEVELS = [4, 6, 8, 10, 12, 14, 16, 18];

	const videoWanted = () => (camId ? { deviceId: { exact: camId } } : { facingMode: 'user' });
	const audioWanted = () => (micId ? { deviceId: { exact: micId } } : true);

	async function startVideo() {
		video?.stop();
		video = null;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: videoWanted() });
			video = stream.getVideoTracks()[0] ?? null;
			camProblem = null;
		} catch (cause) {
			camProblem = deviceProblem(cause, 'camera');
			camOn = false;
		}
	}

	async function startAudio() {
		audio?.stop();
		audio = null;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: audioWanted() });
			audio = stream.getAudioTracks()[0] ?? null;
			micProblem = null;
		} catch (cause) {
			micProblem = deviceProblem(cause, 'microphone');
			micOn = false;
		}
	}

	async function refreshDevices() {
		const all = await navigator.mediaDevices.enumerateDevices();
		cams = all.filter((d) => d.kind === 'videoinput' && d.deviceId);
		mics = all.filter((d) => d.kind === 'audioinput' && d.deviceId);
		speakers = all.filter((d) => d.kind === 'audiooutput' && d.deviceId);
		camId ||= video?.getSettings().deviceId ?? '';
		micId ||= audio?.getSettings().deviceId ?? '';
	}

	onMount(() => {
		if (!navigator.mediaDevices?.getUserMedia) {
			camProblem = 'This page cannot use a camera here';
			micProblem = 'This page cannot use a microphone here';
			camOn = micOn = false;
			return;
		}
		let gone = false;
		void (async () => {
			// One prompt for both the first time; if that fails, ask for each on
			// its own to learn which one is refused or missing.
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoWanted() });
				if (gone) return stream.getTracks().forEach((t) => t.stop());
				audio = stream.getAudioTracks()[0] ?? null;
				video = stream.getVideoTracks()[0] ?? null;
			} catch {
				await startAudio();
				await startVideo();
			}
			if (!gone) await refreshDevices();
		})();
		navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
		return () => {
			gone = true;
			navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
		};
	});

	// The tracks outlive a toggle but not the lobby.
	$effect(() => {
		const track = video;
		return () => track?.stop();
	});
	$effect(() => {
		const track = audio;
		return () => track?.stop();
	});

	$effect(() => {
		if (preview) preview.srcObject = video ? new MediaStream([video]) : null;
	});

	// The meter: loudness of the mic, sampled each frame.
	$effect(() => {
		const track = audio;
		if (!track) {
			level = 0;
			return;
		}
		const context = new AudioContext();
		const analyser = context.createAnalyser();
		analyser.fftSize = 512;
		context.createMediaStreamSource(new MediaStream([track])).connect(analyser);
		const samples = new Float32Array(analyser.fftSize);
		let frame = 0;
		const tick = () => {
			analyser.getFloatTimeDomainData(samples);
			let sum = 0;
			for (const x of samples) sum += x * x;
			// Speech sits around 0.05–0.2 RMS; the root spreads that across the bars.
			level = Math.min(1, Math.sqrt(Math.sqrt(sum / samples.length)) * 1.6);
			frame = requestAnimationFrame(tick);
		};
		void context.resume();
		tick();
		return () => {
			cancelAnimationFrame(frame);
			void context.close();
		};
	});

	function toggleCam() {
		if (camOn) {
			video?.stop();
			video = null;
			camOn = false;
		} else {
			camOn = true;
			void startVideo();
		}
	}

	function toggleMic() {
		if (micOn) {
			audio?.stop();
			audio = null;
			micOn = false;
		} else {
			micOn = true;
			void startAudio();
		}
	}

	async function copyLink() {
		await navigator.clipboard.writeText(link);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canJoin) return;
		onJoin({
			name: you ? you.name : guestName.trim(),
			micOn,
			camOn,
			mic: micId || undefined,
			cam: camId || undefined,
			speaker: speakerId || undefined
		});
	}

	function focusOnMount(node: HTMLElement) {
		node.focus();
	}

	const toggle =
		'flex size-11 items-center justify-center rounded-[12px] border backdrop-blur-sm transition-colors cursor-pointer';
	const glass = 'border-white/15 bg-[rgba(22,29,38,0.82)] text-[#e8eef6] hover:bg-[rgba(34,44,58,0.9)]';
	const off = 'border-[#ef4444] bg-[color-mix(in_oklab,#ef4444_30%,#161d26)] text-[#fecaca]';
	const select = 'z-field w-full min-w-0 truncate !pl-2.5';
</script>

<div class="z-screen overflow-y-auto bg-[var(--z-canvas)] text-[var(--z-ink)]">
	<main
		class="mx-auto grid min-h-full max-w-[1120px] content-center items-start justify-center gap-10 px-9 py-10 lg:grid-cols-[minmax(0,680px)_360px] max-lg:max-w-[680px] max-md:content-start max-md:gap-4 max-md:px-4 max-md:py-4"
	>
		<section class="flex min-w-0 flex-col gap-3.5" aria-label="Your camera and microphone">
			<div class="relative aspect-[16/10] overflow-hidden rounded-[14px] border border-[var(--z-line)] bg-[#11171f] shadow-[var(--z-shadow-tactile)] max-md:aspect-[4/3]">
				{#if video}
					<!-- Mirrored, as a mirror is what people expect of themselves. -->
					<video bind:this={preview} class="size-full -scale-x-100 object-cover" autoplay muted playsinline></video>
				{:else}
					<div class="absolute inset-0 flex flex-col items-center justify-center gap-3">
						<span
							class="z-avatar !size-[84px] !rounded-[18px] !text-[26px]"
							style={identityStyle(you?.email ?? guestName ?? 'guest')}
						>
							{initials(you?.name ?? guestName, you?.email ?? '')}
						</span>
						<span class="text-[13px] text-[#a3b1c2]">{camProblem ?? (camOn ? 'Starting the camera…' : 'Camera off')}</span>
					</div>
				{/if}
				<span class="absolute top-3 left-3 rounded-[6px] border border-white/10 bg-[rgba(7,11,16,0.72)] px-2.5 py-0.5 text-[12px] font-medium text-[#e8eef6]">
					{video ? 'Preview · mirrored' : 'Camera off'}
				</span>
				<div class="absolute bottom-[18px] left-3.5 flex h-[18px] items-end gap-[3px]" title="Microphone level" aria-hidden="true">
					{#each LEVELS as height, i (i)}
						<span
							class="w-1 rounded-[2px] {micOn && level * LEVELS.length > i ? 'bg-[#16a34a]' : 'bg-white/20'}"
							style:height="{height}px"
						></span>
					{/each}
				</div>
				<div class="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-2.5">
					<button
						type="button"
						class="{toggle} {micOn ? glass : off}"
						aria-pressed={!micOn}
						aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
						title={micProblem ?? (micOn ? 'Mute microphone' : 'Unmute microphone')}
						onclick={toggleMic}
					>
						<MeetIcon name={micOn ? 'mic' : 'mic-off'} />
					</button>
					<button
						type="button"
						class="{toggle} {camOn ? glass : off}"
						aria-pressed={!camOn}
						aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
						title={camProblem ?? (camOn ? 'Turn camera off' : 'Turn camera on')}
						onclick={toggleCam}
					>
						<MeetIcon name={camOn ? 'cam' : 'cam-off'} />
					</button>
				</div>
			</div>

			{#if cams.length || mics.length}
				<div class="grid gap-2.5 {canPickSpeaker && speakers.length ? 'grid-cols-3' : 'grid-cols-2'} max-md:grid-cols-2">
					<select class={select} bind:value={camId} aria-label="Camera" onchange={() => camOn && startVideo()}>
						{#each cams as device (device.deviceId)}
							<option value={device.deviceId}>{device.label || 'Camera'}</option>
						{/each}
					</select>
					<select class={select} bind:value={micId} aria-label="Microphone" onchange={() => micOn && startAudio()}>
						{#each mics as device (device.deviceId)}
							<option value={device.deviceId}>{device.label || 'Microphone'}</option>
						{/each}
					</select>
					{#if canPickSpeaker && speakers.length}
						<select class="{select} max-md:hidden" bind:value={speakerId} aria-label="Speakers">
							{#each speakers as device (device.deviceId)}
								<option value={device.deviceId}>{device.label || 'Speakers'}</option>
							{/each}
						</select>
					{/if}
				</div>
			{/if}
		</section>

		<form class="flex min-w-0 flex-col gap-[18px] pt-1.5" onsubmit={submit}>
			<div class="flex items-center gap-2.5">
				<!-- The mark, not the home button: leaving is the call's Leave, not a logo. -->
				<span class="btn-tactile !size-8 !cursor-default !p-0" aria-hidden="true">
					<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none"><path d="M3 3H13L3 13H13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" /></svg>
				</span>
				<span class="text-[13px] font-semibold text-[var(--z-muted)]">Zaur Meet</span>
			</div>

			<h1 class="text-[24px] leading-[1.15] font-bold tracking-[-0.025em] text-[var(--z-ink)] max-md:text-[20px]">Ready to join?</h1>

			<div class="z-card flex items-center gap-3 !shadow-none px-3.5 py-3">
				{#if inRoom.length}
					<div class="flex">
						{#each inRoom.slice(0, 3) as name, i (i)}
							<span class="z-avatar {i ? '-ml-[3px]' : ''} ring-2 ring-[var(--z-surface)]" style={identityStyle(name)}>{initials(name, '')}</span>
						{/each}
					</div>
				{/if}
				<div class="min-w-0 text-[13.5px] font-medium text-[var(--z-body)]">{hereLine(inRoom)}</div>
			</div>

			{#if you}
				<div>
					<div class="text-[12.5px] text-[var(--z-soft)]">Joining as</div>
					<div class="mt-1.5 flex items-center gap-2.5">
						<span class="z-avatar" style={identityStyle(you.email)}>{initials(you.name, you.email)}</span>
						<div class="min-w-0">
							<div class="truncate text-[14px] font-semibold text-[var(--z-ink)]">{you.name}</div>
							<div class="z-mono truncate text-[11.5px] text-[var(--z-soft)]">{you.email}</div>
						</div>
					</div>
				</div>
			{:else}
				<div>
					<label class="block">
						<span class="text-[12.5px] text-[var(--z-soft)]">Your name</span>
						<input
							class="z-field mt-1.5 !h-10 w-full max-md:!h-11 max-md:text-base"
							bind:value={guestName}
							autocomplete="name"
							maxlength="64"
							required
							aria-describedby="meet-name-hint"
							{@attach focusOnMount}
						/>
					</label>
					<p id="meet-name-hint" class="mt-1.5 text-[12.5px] leading-normal text-[var(--z-soft)]">
						Others see this in the call. You don't need an account.
						<a class="text-[var(--z-accent)] hover:underline" href="/login?next={encodeURIComponent(`/meet/${room}`)}">Sign in</a> to join as yourself.
					</p>
				</div>
			{/if}

			{#if blocked.length}
				<div class="flex gap-2.5 rounded-[10px] border border-l-[3px] border-[var(--z-ch-needs-stroke)] bg-[color-mix(in_oklab,var(--z-ch-needs-fill)_40%,var(--z-surface))] px-3 py-2.5" role="status">
					<span class="pt-px text-[var(--z-ch-needs-stroke)]"><MeetIcon name="alert" /></span>
					<div class="text-[12.5px] leading-normal text-[var(--z-ch-needs-ink)]">
						<div class="text-[13px] font-semibold">{blocked.join(' and ')}</div>
						Allow it from the icon in the address bar, or join without it. You can turn it on once you're in.
					</div>
				</div>
			{/if}

			{#if error}
				<p class="rounded-[8px] border border-[var(--z-ch-discard-line)] bg-[var(--z-ch-discard-hover)] px-3 py-2 text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">{error}</p>
			{/if}

			<div class="flex flex-col gap-2.5">
				<button
					type="submit"
					class="btn-tactile btn-primary !h-11 w-full !text-[14.5px] max-md:!h-12"
					disabled={!canJoin}
					{@attach (node) => {
						if (you) node.focus();
					}}
				>
					{joining ? 'Joining…' : camProblem && !camOn ? 'Join with camera off' : 'Join call'}
					<kbd class="z-kbd-inverse max-md:hidden">↵</kbd>
				</button>
				<div class="flex h-[34px] items-center gap-2 rounded-[8px] border border-[var(--z-hairline)] bg-[var(--z-sunken)] pr-1 pl-2.5">
					<span class="text-[var(--z-faint)]"><MeetIcon name="link" /></span>
					<span class="z-mono min-w-0 flex-1 truncate text-[11.5px] text-[var(--z-muted)]">{link.replace(/^https?:\/\//, '')}</span>
					<button type="button" class="btn-tactile !h-[26px] !px-2 !text-[12px]" onclick={copyLink}>
						<MeetIcon name={copied ? 'check' : 'copy'} class="size-3.5" />
						{copied ? 'Copied' : 'Copy'}
					</button>
				</div>
			</div>
		</form>
	</main>
</div>
