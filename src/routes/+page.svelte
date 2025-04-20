<script lang="ts">
	import { apps } from '$lib/config/apps.js';
	import { externalWebsites } from '$lib/config/externalWebsites.js';
	
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
				<a href="#projects" class="cta-primary">Explore Projects</a>
				<a href="https://github.com/nomideusz" class="cta-secondary">GitHub</a>
			</div>
		</div>
	</header>
	
	<main>
		<section id="projects">
			<h2><span class="section-marker">//</span> Projects</h2>
			<div class="project-grid">
				{#each apps as app}
					<a href="/{app.id}" class="project-card">
						<div class="card-icon">{app.icon}</div>
						<h3>{app.name}</h3>
						<p>{app.description}</p>
						<div class="card-footer">
							<span class="visit-link">Visit →</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
		
		<section id="external-sites">
			<h2><span class="section-marker">//</span> External Websites</h2>
			<div class="project-grid">
				{#each externalWebsites as site}
					<a href={site.url} target="_blank" rel="noopener noreferrer" class="project-card external-card">
						<div class="card-icon">{site.icon}</div>
						<h3>{site.name}</h3>
						<p>{site.description}</p>
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
		background-color: #f0f4f8;
		color: #333;
		scroll-behavior: smooth;
	}
	
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}
	
	header {
		margin-bottom: 4rem;
		text-align: center;
	}
	
	.logo h1 {
		font-size: 4rem;
		font-weight: 800;
		margin: 0;
		color: #0053b3; /* Primary blue */
		letter-spacing: -0.05em;
		font-family: 'Space Grotesk', sans-serif;
	}
	
	.tagline {
		margin-top: 0.5rem;
		color: #666;
		font-size: 1.2rem;
	}
	
	.hero {
		margin-top: 3rem;
	}
	
	.hero-text {
		font-size: 1.5rem;
		max-width: 600px;
		margin: 0 auto 2rem auto;
		line-height: 1.4;
		color: #444;
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
		background-color: #e6f0ff;
		color: #0053b3;
		border: 1px solid #0053b3;
	}
	
	.cta-secondary:hover {
		background-color: #d1e5ff;
		transform: translateY(-2px);
	}
	
	section {
		margin-bottom: 4rem;
		padding: 2rem 0;
	}
	
	h2 {
		font-size: 2rem;
		margin-bottom: 2rem;
		color: #0053b3; /* Primary blue */
		display: flex;
		align-items: center;
	}
	
	.section-marker {
		color: #e63946; /* Accent red */
		margin-right: 0.5rem;
		font-family: 'JetBrains Mono', monospace;
		font-weight: bold;
	}
	
	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 2rem;
	}
	
	.project-card {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
		text-decoration: none;
		color: inherit;
		transition: transform 0.3s, box-shadow 0.3s;
		display: flex;
		flex-direction: column;
		height: 100%;
		border-left: 5px solid #0053b3; /* Primary blue */
	}
	
	.card-icon {
		font-size: 2rem;
		margin-bottom: 1rem;
	}
	
	.project-card:hover {
		transform: translateY(-8px);
		box-shadow: 0 15px 25px rgba(0, 0, 0, 0.1);
		border-left-color: #e63946; /* Accent red */
	}
	
	.project-card h3 {
		font-size: 1.5rem;
		margin: 0 0 0.75rem 0;
		color: #0053b3; /* Primary blue */
		font-family: 'Space Grotesk', sans-serif;
		font-weight: 600;
	}
	
	.project-card p {
		margin: 0;
		flex-grow: 1;
		line-height: 1.5;
	}
	
	.card-footer {
		margin-top: 1.5rem;
		display: flex;
		justify-content: flex-end;
	}
	
	.visit-link {
		color: #0053b3; /* Primary blue */
		font-weight: 600;
		display: inline-flex;
		align-items: center;
	}
	
	.project-card:hover .visit-link {
		color: #e63946; /* Accent red */
	}
	
	.about-content {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
	}
	
	.about-content p {
		line-height: 1.6;
		margin-bottom: 1rem;
	}
	
	footer {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid #ddd;
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
	}
	
	.footer-links a:hover, footer p a:hover {
		text-decoration: underline;
		color: #e63946; /* Accent red */
	}
	
	footer p {
		color: #666;
		margin: 0;
	}
	
	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem;
		}
		
		header {
			margin-bottom: 2rem;
		}
		
		.logo h1 {
			font-size: 3rem;
		}
		
		.hero-text {
			font-size: 1.25rem;
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
	}
	
	.external-card {
		border-left: 5px solid #4a9d5f; /* Green for external sites */
	}
	
	.external-card:hover {
		border-left-color: #e63946; /* Accent red on hover */
	}
</style>
