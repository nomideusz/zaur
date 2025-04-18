<script lang="ts">
	import { onMount } from 'svelte';
	
	export let title = '';
	export let url = '';
	
	let iframeLoaded = false;
	let showLoadingIndicator = true;
	
	onMount(() => {
		// Ustaw timeout dla wskaźnika ładowania
		setTimeout(() => {
			showLoadingIndicator = false;
		}, 2000);
	});
	
	function handleIframeLoad() {
		iframeLoaded = true;
		showLoadingIndicator = false;
	}
</script>

<div class="project-container">
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
		{#if showLoadingIndicator}
			<div class="loading-indicator">
				<div class="spinner"></div>
				<span>Ładowanie projektu...</span>
			</div>
		{/if}
		
		<iframe 
			src={url} 
			title={title} 
			class="project-frame {iframeLoaded ? 'loaded' : ''}"
			on:load={handleIframeLoad}
		></iframe>
	</main>
</div>

<style>
	.project-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
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
		position: relative;
	}
	
	.project-frame {
		width: 100%;
		height: 100%;
		border: none;
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	
	.project-frame.loaded {
		opacity: 1;
	}
	
	.loading-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	
	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(0, 83, 179, 0.2);
		border-radius: 50%;
		border-top-color: var(--primary-blue);
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style> 