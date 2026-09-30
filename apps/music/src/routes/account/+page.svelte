<script lang="ts">
	import { submit } from '#lib/api';
	import Icon from '#lib/components/Icon.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Account · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head"><h1>Account</h1></header>
	<div class="z-card card">
		<div class="row">
			<span class="z-avatar size-11 text-[15px]" aria-hidden="true">{[...data.user.name][0]?.toUpperCase()}</span>
			<span class="min-w-0">
				<span class="block truncate font-semibold text-[var(--z-ink)]">{data.user.name}</span>
				<span class="z-caption z-mono block truncate">{data.user.email}</span>
			</span>
		</div>
		<p class="row z-caption">Your playlists, favourites and play counts belong to this account. The library itself is shared.</p>
		<div class="row">
			<p class="z-caption">Your password, two-factor sign-in and devices are looked after in Zaur Mail.</p>
			<!-- A new window: the music keeps playing in this one. -->
			<a class="btn-tactile tall" href={data.manage} target="_blank" rel="noopener">Account settings</a>
		</div>
		<form class="row" method="POST" action="/auth/logout" onsubmit={submit}>
			<p class="z-caption">Signing out here signs this browser out of Zaur Mail too.</p>
			<button class="btn-tactile tall" type="submit"><Icon name="logout" /> Sign out</button>
		</form>
	</div>
</div>

<style>
	.card {
		max-width: 560px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px 16px;
		margin: 0;
		padding: 14px 16px;
	}
	.row + .row {
		border-top: 1px solid var(--z-hairline);
	}
	.row:first-child {
		justify-content: flex-start;
	}
	.row p {
		flex: 1 1 220px;
		margin: 0;
	}
	.row :is(a, button) {
		flex-shrink: 0;
	}
</style>
