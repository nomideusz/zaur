<script lang="ts">
	import { onMount } from 'svelte';
	
	export let title = '';
	export let url = '';
	export let icon = '🔗';
	export let seconds = 3;
	
	let countdown = seconds;
	
	onMount(() => {
		const timer = setInterval(() => {
			countdown--;
			
			if (countdown <= 0) {
				clearInterval(timer);
				window.location.href = url;
			}
		}, 1000);
		
		return () => clearInterval(timer);
	});
	
	function getSecondsText(count: number) {
		if (count === 1) return 'sekundę';
		if (count >= 2 && count <= 4) return 'sekundy';
		return 'sekund';
	}
</script>

<div class="redirect-container">
	<header>
		<div class="header-content">
			<a href="/" class="back-link">
				<span class="back-arrow">←</span>
				<span>Wróć do Zaur</span>
			</a>
			<h1>{title}</h1>
		</div>
	</header>
	
	<main>
		<div class="redirect-info">
			<div class="app-icon">{icon}</div>
			<h2>Przekierowanie do zewnętrznej aplikacji</h2>
			<p>Ta aplikacja wymaga bezpośredniego dostępu i nie może być wyświetlana w ramce.</p>
			<p>Zostaniesz przekierowany za <span class="countdown">{countdown}</span> {getSecondsText(countdown)}...</p>
			
			<div class="buttons">
				<a href={url} class="redirect-now">Przejdź teraz</a>
				<a href="/" class="cancel">Anuluj</a>
			</div>
		</div>
	</main>
</div>

<style>
	.redirect-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		font-family: var(--font-sans);
	}
	
	header {
		background-color: var(--primary-blue);
		color: white;
		padding: 0.75rem 1.5rem;
		border-bottom: 3px solid var(--accent-red);
	}
	
	.header-content {
		display: flex;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}
	
	h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		flex-grow: 1;
		text-align: center;
	}
	
	.back-link {
		display: flex;
		align-items: center;
		color: white;
		text-decoration: none;
		font-weight: 500;
		transition: transform 0.2s;
	}
	
	.back-link:hover {
		transform: translateX(-3px);
	}
	
	.back-arrow {
		margin-right: 0.5rem;
		font-size: 1.25rem;
	}
	
	main {
		flex-grow: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}
	
	.redirect-info {
		background: white;
		border-radius: 12px;
		padding: 3rem;
		max-width: 500px;
		text-align: center;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
		border-left: 5px solid var(--primary-blue);
	}
	
	.app-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}
	
	h2 {
		margin: 0 0 1rem 0;
		color: var(--primary-blue);
		font-family: var(--font-display);
	}
	
	p {
		margin: 0 0 1rem 0;
		color: #555;
		line-height: 1.5;
	}
	
	.countdown {
		font-weight: bold;
		color: var(--accent-red);
		font-size: 1.25rem;
	}
	
	.buttons {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
		justify-content: center;
	}
	
	.redirect-now, .cancel {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.2s;
	}
	
	.redirect-now {
		background-color: var(--primary-blue);
		color: white;
	}
	
	.redirect-now:hover {
		background-color: #004499;
		transform: translateY(-2px);
	}
	
	.cancel {
		border: 1px solid #ddd;
		color: #777;
	}
	
	.cancel:hover {
		background-color: #f5f5f5;
		transform: translateY(-2px);
	}
</style> 