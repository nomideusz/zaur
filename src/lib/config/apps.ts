interface App {
	id: string;
	name: string;
	description: string;
	url: string;
	icon: string;
	supportsIframe: boolean;
	openInNewTab?: boolean;
	category: 'hosted-tools' | 'my-projects';
	poweredBy?: string;
}

export const apps: App[] = [
	{
		id: 'pdf',
		name: 'PDF Tools',
		description: 'PDF tools and utilities for document management',
		url: 'https://pdf.zaur.app',
		icon: 'P',
		supportsIframe: true,  // Zakładamy, że to własna aplikacja która obsługuje iframe
		category: 'hosted-tools',
		poweredBy: 'Stirling PDF'
	},
	{
		id: 'cloud',
		name: 'Cloud Storage',
		description: 'Cloud storage and file management solution',
		url: 'https://cloud.zaur.app',
		icon: 'C',
		supportsIframe: false,  // NextCloud blokuje iframe
		category: 'hosted-tools',
		poweredBy: 'Nextcloud'
	},
	{
		id: 'notes',
		name: 'Notes',
		description: 'Collaborative real-time notes for teams and open source projects',
		url: 'https://notes.zaur.app',
		icon: 'N',
		supportsIframe: true,
		category: 'hosted-tools',
		poweredBy: 'Etherpad'
	},
	{
		id: 'share',
		name: 'File Sharing',
		description: 'Share files with friends and family',
		url: 'https://drive.zaur.app/g/2FbH7cq6YMBqjqeZ',
		icon: 'S',
		supportsIframe: true,  // Zakładamy, że również ma ograniczenia
		category: 'hosted-tools',
		poweredBy: 'Picoshare'
	},
	{
		id: 'kino',
		name: 'Kino',
		description: 'Cinema, what is it really?',
		url: 'https://kino.net.pl',
		icon: 'K',
		supportsIframe: false,
		openInNewTab: true,
		category: 'my-projects'
	},
	{
		id: 'kompi',
		name: 'Kompi',
		description: 'Modern open-source e-commerce platform built with SvelteKit. Sleek, fast, and powerful.',
		url: 'https://kompi.pl',
		icon: 'λ',
		supportsIframe: false,
		openInNewTab: true,
		category: 'my-projects'
	},
	{
		id: 'nieco',
		name: 'Nieco',
		description: 'Embracing the Kaizen way: transforming your life through small, consistent steps. Progressive improvement, one moment at a time.',
		url: 'https://nieco.pl',
		icon: 'N',
		supportsIframe: false,
		openInNewTab: true,
		category: 'my-projects'
	}
];

export function getAppById(id: string): App | undefined {
	return apps.find(app => app.id === id);
} 