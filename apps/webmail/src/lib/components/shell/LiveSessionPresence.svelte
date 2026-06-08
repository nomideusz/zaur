<script lang="ts">
	import { activeSessions } from '$live/session-presence';
	import { health } from 'svelte-realtime/client';

	const sessions = $derived($activeSessions ?? []);
	const sessionCount = $derived(sessions.length);
	const healthy = $derived($health !== 'degraded');
	const label = $derived(
		sessionCount === 1 ? '1 live session' : `${sessionCount} live sessions`
	);
</script>

<div
	class="inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-surface px-3 text-xs text-fg-muted"
	title={healthy ? label : 'Realtime connection is reconnecting'}
	aria-label={healthy ? label : 'Realtime connection is reconnecting'}
>
	<span
		class={[
			'size-1.5 rounded-full',
			healthy ? 'bg-accent' : 'bg-fg-muted'
		]}
		aria-hidden="true"
	></span>
	<span>{healthy ? label : 'Live sync'}</span>
</div>
