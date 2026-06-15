<script lang="ts">
	import Sprite from '$lib/Sprite.svelte';

	const title = 'Zaur — mail, chat, discuss';
	const description = 'Private mail, chat, and discussion. One account, no ads, no tracking.';

	const products = [
		{
			id: 'mail',
			name: 'Mail',
			desc: 'A clean inbox and your own @zaur.app address.',
			href: 'https://webmail.zaur.app'
		},
		{
			id: 'chat',
			name: 'Chat',
			desc: 'Real-time group chat for teams and friends.',
			href: 'https://chat.zaur.app'
		},
		{
			id: 'discuss',
			name: 'Discuss',
			desc: 'A community forum for longer conversations.',
			href: 'https://discourse.zaur.app'
		}
	];
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://zaur.app/" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<link rel="canonical" href="https://zaur.app/" />
</svelte:head>

<section class="zw-hero zw-container">
	<div class="zw-hero__mark">
		<Sprite frame="happy" size={96} label="Zaur" />
	</div>
	<h1 class="zw-hero__title">Private and focused.</h1>
	<p class="zw-hero__lede">No ads, no tracking.</p>
</section>

<nav class="zw-products zw-container" aria-label="Products">
	{#each products as p (p.id)}
		<a class="zw-card" id={p.id} href={p.href}>
			<span class="zw-card__name">{p.name}</span>
			<span class="zw-card__desc">{p.desc}</span>
			<span class="zw-arrow" aria-hidden="true">→</span>
		</a>
	{/each}
</nav>

<p class="zw-aside zw-container">
	Looking for tours and travel? Zaur's old site moved to
	<a class="z-link" href="https://thebest.travel">thebest.travel</a>.
</p>
