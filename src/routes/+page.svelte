<script lang="ts">
	import { apps } from '$lib/config/apps.js';
	import { externalWebsites } from '$lib/config/externalWebsites.js';
	import { PersistedState, IsIdle, onClickOutside } from 'runed';
	import { browser } from '$app/environment';
	
	// Definiowanie wspólnego typu dla projektów i stron zewnętrznych
	type Project = {
		id: string;
		name: string;
		description: string;
		url: string;
		icon: string;
		openInNewTab?: boolean;
		category?: 'hosted-tools' | 'my-projects';
	};
	
	// Typ dla aktualności
	type NewsItem = {
		title: string;
		description: string;
		url: string;
		source: string;
		date: Date;
		category: 'tech' | 'opensource' | 'dev' | 'design';
	};
	
	// Zapamiętywanie ostatnio odwiedzonej sekcji
	const defaultSection = 'projects';
	const lastVisitedSection = browser 
		? new PersistedState('zaur-last-section', defaultSection)
		: { current: defaultSection };
	
	// Zapamiętywanie ostatnio wyświetlonych aktualności 
	const lastNewsShown = browser
		? new PersistedState('zaur-last-news-date', new Date().toISOString())
		: { current: new Date().toISOString() };
	
	// Wykrywanie bezczynności użytkownika (po 30 sekundach)
	const idleDetector = browser ? new IsIdle({ timeout: 30000 }) : { current: false };
	
	// Stan dla widoczności strony (czy użytkownik jest na stronie)
	let isPageVisible = $state(true);
	
	// Stan dla sugestii
	let showSuggestions = $state(false);
	
	// Stan dla wiadomości
	let showNews = $state(false);
	let currentNewsItem = $state<NewsItem | null>(null);
	
	// Stan dla mobilnego menu
	let mobileMenuOpen = $state(false);
	let mobileMenuRef = $state<HTMLElement | null>(null);
	
	// Referencja do przycisku menu
	let menuButtonRef = $state<HTMLElement | null>(null);
	
	// Obsługa zamykania mobilnego menu po kliknięciu poza
	$effect(() => {
		if (mobileMenuRef) {
			const clickOutside = onClickOutside(
				() => mobileMenuRef,
				() => {
					mobileMenuOpen = false;
				},
				{ immediate: false }
			);
			
			if (mobileMenuOpen) {
				clickOutside.start();
			} else {
				clickOutside.stop();
			}
			
			return () => {
				clickOutside.stop();
			};
		}
	});
	
	// Przykładowe aktualności (docelowo będą pobierane z serwera)
	const mockNewsItems: NewsItem[] = [
		{
			title: 'New React 19 features that will change how you write components',
			description: 'React 19 introduces exciting new APIs and performance improvements that streamline component development.',
			url: 'https://react.dev/blog',
			source: 'React Blog',
			date: new Date(),
			category: 'dev'
		},
		{
			title: 'SvelteKit 2.0 Released with Revolutionary Performance Optimizations',
			description: 'The latest version of SvelteKit brings substantial performance improvements and new features for developers.',
			url: 'https://svelte.dev/blog',
			source: 'Svelte Blog',
			date: new Date(),
			category: 'dev'
		},
		{
			title: 'Top Open Source Projects to Watch in 2023',
			description: 'Discover the most promising open source projects that are gaining traction this year.',
			url: 'https://github.com/trending',
			source: 'GitHub Trending',
			date: new Date(),
			category: 'opensource'
		},
		{
			title: 'Minimalist Design Trends for Web Applications in 2023',
			description: 'Learn about the latest minimalist design patterns that are dominating web development this year.',
			url: 'https://www.smashingmagazine.com/',
			source: 'Smashing Magazine',
			date: new Date(),
			category: 'design'
		}
	];
	
	// Funkcja do sprawdzania, czy można pokazać aktualności
	function shouldShowNews(): boolean {
		const lastShown = new Date(lastNewsShown.current);
		const now = new Date();
		// Pokazuj aktualności nie częściej niż co 24 godziny
		return now.getTime() - lastShown.getTime() > 24 * 60 * 60 * 1000;
	}
	
	// Funkcja do pokazywania losowych aktualności
	function showRandomNews() {
		if (shouldShowNews() && !showSuggestions && !showNews) {
			const randomNews = mockNewsItems[Math.floor(Math.random() * mockNewsItems.length)];
			currentNewsItem = randomNews;
			showNews = true;
			lastNewsShown.current = new Date().toISOString();
		}
	}
	
	// Wywołanie funkcji przy załadowaniu strony z niewielkim opóźnieniem
	$effect(() => {
		setTimeout(() => {
			showRandomNews();
		}, 5000); // Pokazuj po 5 sekundach od załadowania strony
	});
	
	// Funkcja do zamykania okna aktualności
	function hideNews() {
		showNews = false;
	}
	
	// Funkcja przełączania menu mobilnego
	function toggleMobileMenu(event: MouseEvent) {
		// Zatrzymaj propagację zdarzenia, aby nie trafiło do onClickOutside
		if (event) {
			event.stopPropagation();
		}
		mobileMenuOpen = !mobileMenuOpen;
	}
	
	// Funkcja do zamykania menu mobilnego
	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
	
	// Losowa sugestia projektu do odwiedzenia
	let suggestedProject = $state<Project>(getRandomProject());
	
	function getRandomProject(): Project {
		const allProjects = [...apps, ...externalWebsites] as Project[];
		return allProjects[Math.floor(Math.random() * allProjects.length)];
	}
	
	// Obsługa stanu bezczynności
	$effect(() => {
		if (browser) {
			// Dodanie obsługi widoczności strony
			const handleVisibilityChange = () => {
				isPageVisible = document.visibilityState === 'visible';
			};
			
			document.addEventListener('visibilitychange', handleVisibilityChange);
			
			// Wywołaj raz, aby ustawić początkowy stan
			handleVisibilityChange();
			
			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			};
		}
	});
	
	// Pokazuj sugestie tylko gdy użytkownik jest bezczynny I strona jest widoczna
	$effect(() => {
		if (idleDetector.current && isPageVisible && !showSuggestions) {
			showSuggestions = true;
			suggestedProject = getRandomProject();
		}
	});
	
	// Ukryj sugestie tylko po kliknięciu przycisku zamykania lub linku
	function hideSuggestions() {
		showSuggestions = false;
	}
	
	// Funkcja do nawigacji i zapamiętywania sekcji
	function navigateTo(sectionId: string) {
		hideSuggestions();
		hideNews();
		closeMobileMenu();
		lastVisitedSection.current = sectionId;
		const section = document.getElementById(sectionId);
		if (section) {
			section.scrollIntoView({ behavior: 'smooth' });
		}
	}
	
	// Przy montowaniu komponentu, przewijamy do ostatnio odwiedzonej sekcji
	$effect(() => {
		const section = document.getElementById(lastVisitedSection.current);
		if (section) {
			// Dodajemy małe opóźnienie, aby upewnić się, że DOM jest gotowy
			setTimeout(() => {
				section.scrollIntoView({ behavior: 'auto' });
			}, 100);
		}
	});
	
	// For the animation effect on scroll
	let visible = false;
	
	// Display current year in the footer
	const currentYear = new Date().getFullYear();
</script>

<div class="dashboard">
	<header>
		<div class="logo">
			<h1>ZAUR</h1>
			<p class="tagline">Open Source Projects Suite</p>
		</div>
		
		<div class="hero">
			<p class="hero-text">
				Navigating the future through open source innovation
			</p>
			<div class="cta-buttons">
				<a href="#projects" class="cta-primary" onclick={(e) => { e.preventDefault(); navigateTo('projects'); }}>Explore Projects</a>
				<a href="https://github.com/nomideusz" class="cta-secondary">GitHub</a>
			</div>
		</div>
	</header>
	
	<main>
		<!-- Desktop Navigation -->
		<nav class="page-nav desktop-nav">
			<a href="#projects" class="nav-link" class:active={lastVisitedSection.current === 'projects'} onclick={(e) => { e.preventDefault(); navigateTo('projects'); }}>Projects</a>
			<a href="#external-sites" class="nav-link" class:active={lastVisitedSection.current === 'external-sites'} onclick={(e) => { e.preventDefault(); navigateTo('external-sites'); }}>External Sites</a>
			<a href="/news" class="nav-link">News</a>
			<a href="#about" class="nav-link" class:active={lastVisitedSection.current === 'about'} onclick={(e) => { e.preventDefault(); navigateTo('about'); }}>About</a>
		</nav>
		
		<!-- Mobile Menu Button -->
		<button 
			class="mobile-menu-button" 
			onclick={(e) => toggleMobileMenu(e)} 
			onkeydown={(e) => e.key === 'Enter' && (mobileMenuOpen = !mobileMenuOpen)}
			aria-expanded={mobileMenuOpen}
			aria-label="Toggle mobile menu"
			bind:this={menuButtonRef}
		>
			<div class="menu-icon" class:open={mobileMenuOpen}>
				<span></span>
				<span></span>
				<span></span>
			</div>
		</button>
		
		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<nav class="mobile-nav" bind:this={mobileMenuRef}>
				<button 
					class="mobile-menu-close" 
					onclick={(e) => { 
						e.stopPropagation(); 
						mobileMenuOpen = false; // Directly set state variable 
					}} 
					onkeydown={(e) => e.key === 'Enter' && (mobileMenuOpen = false)} 
					aria-label="Close menu"
				>×</button>
				<a href="#projects" class="nav-link" class:active={lastVisitedSection.current === 'projects'} onclick={(e) => { e.preventDefault(); navigateTo('projects'); }}>Projects</a>
				<a href="#external-sites" class="nav-link" class:active={lastVisitedSection.current === 'external-sites'} onclick={(e) => { e.preventDefault(); navigateTo('external-sites'); }}>External Sites</a>
				<a href="/news" class="nav-link">News</a>
				<a href="#about" class="nav-link" class:active={lastVisitedSection.current === 'about'} onclick={(e) => { e.preventDefault(); navigateTo('about'); }}>About</a>
			</nav>
		{/if}
		
		<!-- Okno sugestii po bezczynności -->
		{#if showSuggestions}
			<div class="suggestion-box">
				<div class="suggestion-content">
					<button class="suggestion-close" onclick={hideSuggestions} onkeydown={(e) => e.key === 'Enter' && hideSuggestions()} aria-label="Close suggestion">×</button>
					<p>Looking for something interesting?</p>
					<div class="suggestion-project">
						<div class="suggestion-icon" style={suggestedProject.category === 'my-projects' || !suggestedProject.category ? 'background: #f5f0ff; color: #8e44ad;' : suggestedProject.id === 'external-card' ? 'background: #f0f8f1; color: #4a9d5f;' : 'background: #f0f7ff; color: #0053b3;'}>
							{suggestedProject.icon}
						</div>
						<div class="suggestion-details">
							<h4>{suggestedProject.name}</h4>
							<p>{suggestedProject.description}</p>
							<a href={suggestedProject.url} target="_blank" rel="noopener noreferrer" onclick={hideSuggestions}>Explore now →</a>
						</div>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Okno z aktualnościami -->
		{#if showNews && currentNewsItem}
			<div class="news-box">
				<div class="news-content">
					<div class="news-badge">{currentNewsItem.category}</div>
					<button class="news-close" onclick={hideNews} onkeydown={(e) => e.key === 'Enter' && hideNews()} aria-label="Close news">×</button>
					<p class="news-intro">Zaur found something interesting for you:</p>
					<div class="news-item">
						<h4>{currentNewsItem.title}</h4>
						<p>{currentNewsItem.description}</p>
						<div class="news-meta">
							<span class="news-source">Source: {currentNewsItem.source}</span>
						</div>
						<a href={currentNewsItem.url} target="_blank" rel="noopener noreferrer" onclick={hideNews}>Read more →</a>
					</div>
				</div>
			</div>
		{/if}
		
		<section id="projects">
			<h2><span class="section-marker">//</span> Projects</h2>
			
			<h3 class="category-title">Open Source Tools</h3>
			<p class="section-intro">Useful free tools hosted by the author of Zaur:</p>
			<div class="project-grid">
				{#each apps.filter(app => app.category === 'hosted-tools') as app}
					<a href="/{app.id}" class="project-card">
						<div class="card-header">
							<div class="card-icon">{app.icon}</div>
							<h3>{app.name}</h3>
						</div>
						<p class="card-description">{app.description}</p>
						{#if app.poweredBy}
							<p class="tech-info">Powered by {app.poweredBy}</p>
						{/if}
						<div class="card-footer">
							<span class="visit-link">Visit →</span>
						</div>
					</a>
				{/each}
			</div>
			
			<h3 class="category-title">Author's Open Source Projects</h3>
			<p class="section-intro">Projects created and maintained by the author of Zaur:</p>
			<div class="project-grid">
				{#each apps.filter(app => app.category === 'my-projects') as app}
					<a href={app.url} target={app.openInNewTab ? "_blank" : ""} rel={app.openInNewTab ? "noopener noreferrer" : ""} class="project-card my-project">
						<div class="card-header">
							<div class="card-icon">{app.icon}</div>
							<h3>{app.name}</h3>
						</div>
						<p class="url-info">{app.url.replace(/^https?:\/\//, '')}</p>
						<p class="card-description">{app.description}</p>
						<div class="card-footer">
							<span class="visit-link">Visit →</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
		
		<section id="external-sites">
			<h2><span class="section-marker">//</span> External Websites</h2>
			<p class="section-intro">Other projects and websites created by the author of Zaur:</p>
			<div class="project-grid">
				{#each externalWebsites as site}
					<a href={site.url} target="_blank" rel="noopener noreferrer" class="project-card external-card">
						<div class="card-header">
							<div class="card-icon">{site.icon}</div>
							<h3>{site.name}</h3>
						</div>
						<p class="url-info">{site.url.replace(/^https?:\/\//, '')}</p>
						<p class="card-description">{site.description}</p>
						<div class="card-footer">
							<span class="visit-link">Visit External Site →</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
		
		<section id="about">
			<h2><span class="section-marker">//</span> About Zaur</h2>
			<div class="about-content">
				<p>
					Zaur is a collection of open source projects designed to improve productivity
					and simplify common tasks. Each project runs independently on CapRover and offers
					unique functionality while maintaining a consistent user experience.
				</p>
				<p>
					Our mission is to create high-quality, accessible tools that anyone can use and contribute to.
				</p>
			</div>
		</section>
	</main>
	
	<footer>
		<div class="footer-content">
			<div class="footer-links">
				<a href="https://github.com/nomideusz">GitHub</a>
				<a href="#projects">Projects</a>
				<a href="#external-sites">External Sites</a>
				<a href="/news">News</a>
				<a href="#about">About</a>
				<a href="mailto:contact@zaur.app">Contact</a>
			</div>
			<p>© {currentYear} <a href="https://zaur.app">zaur.app</a></p>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: linear-gradient(to bottom, #f8f9fc, #f4f7fa);
		color: #333;
		scroll-behavior: smooth;
		line-height: 1.6;
		min-height: 100vh;
	}
	
	.dashboard {
		max-width: 1140px;
		margin: 0 auto;
		padding: 2.5rem 2rem;
	}
	
	header {
		margin-bottom: 3.5rem;
		text-align: center;
		position: relative;
	}
	
	.logo h1 {
		font-size: 3.5rem;
		font-weight: 800;
		margin: 0;
		color: #0053b3; /* Primary blue */
		letter-spacing: -0.05em;
		font-family: 'Space Grotesk', sans-serif;
		position: relative;
		display: inline-block;
	}
	
	.logo h1::after {
		content: '';
		position: absolute;
		bottom: 10px;
		right: -8px;
		width: 8px;
		height: 8px;
		background-color: #e63946; /* Accent red */
		border-radius: 50%;
	}
	
	.tagline {
		margin-top: 0.5rem;
		color: #555;
		font-size: 1.1rem;
		font-weight: 400;
		opacity: 0.9;
	}
	
	.hero {
		margin-top: 3rem;
		max-width: 700px;
		margin-left: auto;
		margin-right: auto;
	}
	
	.hero-text {
		font-size: 1.3rem;
		margin: 0 auto 2rem auto;
		line-height: 1.5;
		color: #444;
		font-weight: 400;
	}
	
	.cta-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 2rem;
	}
	
	.cta-primary, .cta-secondary {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s ease;
	}
	
	.cta-primary {
		background-color: #0053b3;
		color: white;
	}
	
	.cta-primary:hover {
		background-color: #003b80;
		transform: translateY(-2px);
	}
	
	.cta-secondary {
		background-color: #f0f7ff;
		color: #0053b3;
		border: 1px solid #d1e5ff;
	}
	
	.cta-secondary:hover {
		background-color: #e6f0ff;
		transform: translateY(-2px);
	}
	
	section {
		margin-bottom: 3rem;
		padding: 1.5rem 0;
	}
	
	h2 {
		font-size: 1.6rem;
		margin-bottom: 1.25rem;
		color: #0053b3; /* Primary blue */
		display: flex;
		align-items: center;
		font-weight: 700;
	}
	
	.section-marker {
		color: #e63946; /* Accent red */
		margin-right: 0.5rem;
		font-family: 'JetBrains Mono', monospace;
		font-weight: bold;
		opacity: 0.9;
	}
	
	.section-intro {
		margin-top: -0.5rem;
		margin-bottom: 1.5rem;
		color: #555;
		font-size: 1rem;
		line-height: 1.5;
	}
	
	.category-title {
		font-size: 1.35rem;
		margin: 2.5rem 0 0.5rem 0;
		color: #333;
		font-family: 'Space Grotesk', sans-serif;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	
	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	
	.project-card {
		background: white;
		border-radius: 8px;
		padding: 1.2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		height: 100%;
		border-left: 3px solid #0053b3; /* Primary blue */
		position: relative;
		overflow: hidden;
	}
	
	.card-header {
		display: flex;
		align-items: center;
		margin-bottom: 0.6rem;
	}
	
	.card-icon {
		font-size: 1.2rem;
		display: flex;
		background: #f0f7ff;
		height: 2rem;
		width: 2rem;
		align-items: center;
		justify-content: center;
		box-shadow: none;
		border-radius: 50%;
		color: #0053b3;
		font-weight: 600;
		font-family: 'Space Grotesk', sans-serif;
		margin-right: 0.8rem;
		flex-shrink: 0;
	}
	
	.project-card h3 {
		font-size: 1.15rem;
		margin: 0;
		color: #0053b3; /* Primary blue */
		font-family: 'Space Grotesk', sans-serif;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	
	.project-card p {
		margin: 0;
		line-height: 1.4;
		color: #555;
		font-size: 0.9rem;
	}
	
	.card-description {
		margin-bottom: 0.5rem !important;
	}
	
	.card-footer {
		margin-top: auto;
		font-weight: 500;
		font-size: 0.85rem;
		padding-top: 0.8rem;
	}
	
	.tech-info {
		font-size: 0.75rem;
		color: #0053b3;
		margin-top: 0.6rem;
		font-weight: 500;
		padding: 0.2rem 0.5rem;
		background: #f0f7ff;
		border-radius: 4px;
		display: inline-block;
		letter-spacing: 0.01em;
	}
	
	.url-info {
		font-size: 0.75rem;
		color: #888;
		margin: 0 0 0.3rem 0;
		font-family: 'JetBrains Mono', monospace;
		font-weight: 400;
	}
	
	.visit-link {
		color: #0053b3;
		display: flex;
		align-items: center;
		transition: all 0.2s ease;
		font-size: 0.85rem;
		font-weight: 600;
		opacity: 0.85;
	}
	
	.visit-link::after {
		content: '';
		width: 0;
		height: 1px;
		background-color: #e63946;
		margin-left: 4px;
		transition: all 0.2s ease;
		opacity: 0;
	}
	
	.project-card:hover .visit-link::after {
		width: 12px;
		opacity: 1;
	}
	
	.project-card:hover .visit-link {
		color: #e63946; /* Accent red */
		opacity: 1;
	}
	
	.project-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 83, 179, 0.06);
		border-left-color: #e63946; /* Accent red */
	}
	
	.about-content {
		background: white;
		border-radius: 12px;
		padding: 2.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}
	
	.about-content p {
		line-height: 1.6;
		margin-bottom: 1rem;
	}
	
	footer {
		margin-top: 5rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		text-align: center;
	}
	
	.footer-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	
	.footer-links {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 1rem;
	}
	
	.footer-links a, footer p a {
		color: #0053b3;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.95rem;
		transition: color 0.2s;
	}
	
	.footer-links a:hover, footer p a:hover {
		color: #e63946; /* Accent red */
	}
	
	footer p {
		color: #888;
		margin: 0;
		font-size: 0.9rem;
	}
	
	/* Dodajemy minimalistyczną linię dekoracyjną na środku stopki */
	.footer-content::before {
		content: '';
		display: block;
		width: 30px;
		height: 3px;
		background: linear-gradient(to right, transparent, #0053b3, transparent);
		margin: 0 auto 1.5rem auto;
		opacity: 0.3;
	}
	
	@media (max-width: 768px) {
		.dashboard {
			padding: 1.5rem 1rem;
		}
		
		header {
			margin-bottom: 2rem;
		}
		
		.logo h1 {
			font-size: 2.75rem;
		}
		
		.logo h1::after {
			width: 6px;
			height: 6px;
			bottom: 8px;
			right: -6px;
		}
		
		.hero-text {
			font-size: 1.1rem;
		}
		
		.project-grid {
			grid-template-columns: 1fr;
		}
		
		.cta-buttons {
			flex-direction: column;
			gap: 0.75rem;
		}
		
		.footer-links {
			flex-wrap: wrap;
			justify-content: center;
		}
		
		h2 {
			font-size: 1.4rem;
		}
		
		.category-title {
			font-size: 1.2rem;
		}
	}
	
	.external-card {
		border-left: 3px solid #4a9d5f; /* Green for external sites */
	}
	
	.external-card:hover {
		border-left-color: #e63946; /* Accent red on hover */
	}
	
	.my-project {
		border-left: 3px solid #8e44ad; /* Purple for my projects */
	}
	
	.my-project:hover {
		border-left-color: #e63946; /* Accent red on hover */
	}
	
	/* Dodajemy subtelny efekt tła dla karty */
	.project-card::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		width: 90px;
		height: 90px;
		background: linear-gradient(135deg, rgba(248, 249, 252, 0.7) 0%, rgba(255, 255, 255, 0) 70%);
		z-index: 0;
		pointer-events: none;
	}
	
	.external-card .card-icon {
		background: #f0f8f1;
		color: #4a9d5f;
	}
	
	.my-project .card-icon {
		background: #f5f0ff;
		color: #8e44ad;
	}
	
	/* Dodajemy minimalistyczne menu nawigacyjne */
	.page-nav {
		display: flex;
		justify-content: center;
		margin-bottom: 2rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.04);
		padding-bottom: 1rem;
	}
	
	.nav-link {
		color: #555;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		transition: all 0.2s ease;
		position: relative;
	}
	
	.nav-link:hover {
		color: #0053b3;
	}
	
	.nav-link::after {
		content: '';
		position: absolute;
		width: 0;
		height: 2px;
		bottom: -2px;
		left: 50%;
		background-color: #0053b3;
		transition: all 0.2s ease;
		transform: translateX(-50%);
		opacity: 0;
	}
	
	.nav-link:hover::after {
		width: 20px;
		opacity: 1;
	}
	
	.nav-link.active {
		color: #0053b3;
		font-weight: 600;
	}
	
	.nav-link.active::after {
		width: 20px;
		opacity: 1;
	}
	
	/* Ulepszony styl dla przycisków CTA */
	.cta-primary:hover, .cta-secondary:hover {
		filter: brightness(1.05);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}
	
	/* Delikatne podświetlenie headera */
	header::after {
		content: '';
		position: absolute;
		bottom: -20px;
		left: 50%;
		transform: translateX(-50%);
		width: 100px;
		height: 1px;
		background: linear-gradient(to right, transparent, rgba(0, 83, 179, 0.1), transparent);
	}
	
	/* Style dla okna sugestii */
	.suggestion-box {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 1000;
		background: white;
		border-radius: 10px;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
		max-width: 350px;
		animation: slide-in 0.3s ease;
		border-left: 3px solid #0053b3;
	}
	
	.suggestion-content {
		padding: 20px;
		position: relative;
	}
	
	.suggestion-close {
		position: absolute;
		top: 10px;
		right: 10px;
		font-size: 20px;
		color: #aaa;
		cursor: pointer;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: none;
		background: transparent;
		padding: 0;
	}
	
	.suggestion-close:hover {
		background: #f5f5f5;
		color: #333;
	}
	
	.suggestion-project {
		display: flex;
		margin-top: 10px;
		align-items: flex-start;
	}
	
	.suggestion-icon {
		font-size: 1.2rem;
		display: flex;
		background: #f0f7ff;
		height: 2.5rem;
		width: 2.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		margin-right: 15px;
		flex-shrink: 0;
	}
	
	.suggestion-details h4 {
		margin: 0 0 5px 0;
		font-size: 1.1rem;
		color: #0053b3;
	}
	
	.suggestion-details p {
		margin: 0 0 10px 0;
		font-size: 0.9rem;
		color: #555;
		line-height: 1.4;
	}
	
	.suggestion-details a {
		color: #0053b3;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		display: inline-block;
	}
	
	.suggestion-details a:hover {
		color: #e63946;
	}
	
	@keyframes slide-in {
		0% {
			transform: translateX(100px);
			opacity: 0;
		}
		100% {
			transform: translateX(0);
			opacity: 1;
		}
	}
	
	@media (max-width: 768px) {
		.suggestion-box {
			bottom: 10px;
			right: 10px;
			left: 10px;
			max-width: none;
		}
	}
	
	/* Styl dla mobilnego menu */
	.mobile-menu-button {
		display: none;
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 1100;
		background: white;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		align-items: center;
		justify-content: center;
	}
	
	.menu-icon {
		width: 20px;
		height: 16px;
		position: relative;
		transform: rotate(0deg);
		transition: 0.5s ease-in-out;
	}
	
	.menu-icon span {
		display: block;
		position: absolute;
		height: 2px;
		width: 100%;
		background: #0053b3;
		border-radius: 2px;
		opacity: 1;
		left: 0;
		transform: rotate(0deg);
		transition: 0.25s ease-in-out;
	}
	
	.menu-icon span:nth-child(1) {
		top: 0;
	}
	
	.menu-icon span:nth-child(2) {
		top: 7px;
	}
	
	.menu-icon span:nth-child(3) {
		top: 14px;
	}
	
	.menu-icon.open span:nth-child(1) {
		top: 7px;
		transform: rotate(135deg);
	}
	
	.menu-icon.open span:nth-child(2) {
		opacity: 0;
		left: -60px;
	}
	
	.menu-icon.open span:nth-child(3) {
		top: 7px;
		transform: rotate(-135deg);
	}
	
	.mobile-nav {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: white;
		z-index: 1000;
		padding: 80px 20px 20px;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
		animation: slide-down 0.3s ease;
		flex-direction: column;
		align-items: center;
	}
	
	.mobile-nav .nav-link {
		margin: 10px 0;
		padding: 10px 0;
		font-size: 1.1rem;
	}
	
	@keyframes slide-down {
		0% {
			transform: translateY(-100%);
		}
		100% {
			transform: translateY(0);
		}
	}
	
	@media (max-width: 768px) {
		.desktop-nav {
			display: none;
		}
		
		.mobile-menu-button {
			display: flex;
		}
		
		.mobile-nav {
			display: flex;
		}
		
		.dashboard {
			padding-top: 80px;
		}
	}
	
	/* Style dla okna z aktualnościami */
	.news-box {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 1000;
		background: white;
		border-radius: 10px;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
		max-width: 380px;
		animation: slide-in 0.3s ease;
		border-left: 3px solid #4a9d5f; /* Zielony dla aktualności */
	}
	
	.news-content {
		padding: 20px;
		position: relative;
	}
	
	.news-close {
		position: absolute;
		top: 10px;
		right: 10px;
		font-size: 20px;
		color: #aaa;
		cursor: pointer;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		z-index: 10;
		border: none;
		background: transparent;
		padding: 0;
	}
	
	.news-close:hover {
		background: #f5f5f5;
		color: #333;
	}
	
	.news-badge {
		position: absolute;
		top: 10px;
		left: 20px;
		background: #f0f8f1;
		color: #4a9d5f;
		padding: 2px 10px;
		border-radius: 12px;
		font-size: 0.7rem;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.5px;
	}
	
	.news-intro {
		margin: 0 0 15px 0;
		color: #666;
		font-size: 0.9rem;
		margin-top: 25px;
	}
	
	.news-item h4 {
		margin: 0 0 8px 0;
		font-size: 1.1rem;
		color: #0053b3;
		line-height: 1.4;
	}
	
	.news-item p {
		margin: 0 0 15px 0;
		font-size: 0.9rem;
		color: #555;
		line-height: 1.5;
	}
	
	.news-meta {
		margin-bottom: 12px;
		display: flex;
		align-items: center;
	}
	
	.news-source {
		font-size: 0.8rem;
		color: #888;
		font-style: italic;
	}
	
	.news-item a {
		color: #4a9d5f;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		display: inline-block;
		margin-top: 5px;
	}
	
	.news-item a:hover {
		color: #e63946;
	}
	
	@media (max-width: 768px) {
		.news-box {
			bottom: 10px;
			right: 10px;
			left: 10px;
			max-width: none;
		}
	}
	
	.mobile-menu-close {
		position: absolute;
		top: 20px;
		right: 20px;
		font-size: 24px;
		color: #aaa;
		cursor: pointer;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: none;
		background: transparent;
		padding: 0;
		z-index: 1001;
	}
	
	.mobile-menu-close:hover {
		background: #f5f5f5;
		color: #333;
	}
</style>
