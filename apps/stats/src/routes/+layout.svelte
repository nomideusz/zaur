<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SITES } from '#lib/sites';

	let { children } = $props();
	const current = $derived(page.params.site);
</script>

<header>
	<a class="home" href={resolve('/')} aria-current={page.url.pathname === '/' ? 'page' : undefined}>Stats</a>
	<nav aria-label="Sites">
		{#each SITES as s (s.id)}
			<a href={resolve('/s/[site]', { site: s.id })} aria-current={current === s.id ? 'page' : undefined}>{s.name}</a>
		{/each}
		<a href={resolve('/s/[site]', { site: 'all' })} aria-current={current === 'all' ? 'page' : undefined}>All sites</a>
	</nav>
	<form method="POST" action="/auth/logout">
		<button class="btn-tactile" type="submit">Sign out</button>
	</form>
</header>

<main>
	{@render children()}
</main>

<footer>
	Places and networks: <a href="https://db-ip.com" rel="noopener noreferrer">IP Geolocation by DB-IP</a>. Addresses are read to find them and never kept.
</footer>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 16px;
		max-width: 1280px;
		margin: 0 auto;
		padding: 12px 16px;
	}
	.home {
		font-size: 15px;
		font-weight: 700;
		color: var(--z-ink);
		text-decoration: none;
	}
	nav {
		display: flex;
		flex: 1;
		gap: 2px;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}
	nav a {
		padding: 4px 8px;
		font-size: 13px;
		color: var(--z-muted);
		text-decoration: none;
		white-space: nowrap;
		border-radius: 6px;
	}
	nav a:hover {
		background: var(--z-sunken);
	}
	nav a[aria-current='page'] {
		color: var(--z-accent-ink);
		background: var(--z-accent-soft);
	}
	main {
		max-width: 1280px;
		margin: 0 auto;
		padding: 4px 16px 24px;
	}
	footer {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 16px 24px;
		font-size: 12px;
		color: var(--z-soft);
	}
	footer a {
		color: inherit;
		text-decoration: underline;
	}
	@media (max-width: 720px) {
		header {
			flex-wrap: wrap;
			justify-content: space-between;
		}
		nav {
			order: 3;
			flex-basis: 100%;
			flex-wrap: wrap;
			overflow: visible;
		}
	}
</style>
