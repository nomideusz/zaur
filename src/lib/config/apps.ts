interface App {
	id: string;
	name: string;
	description: string;
	url: string;
	icon: string;
	supportsIframe: boolean;
	openInNewTab?: boolean;
}

export const apps: App[] = [
	{
		id: 'pdf',
		name: 'PDF Tools',
		description: 'PDF tools and utilities for document management',
		url: 'https://pdf.zaur.app',
		icon: '📄',
		supportsIframe: true  // Zakładamy, że to własna aplikacja która obsługuje iframe
	},
	{
		id: 'cloud',
		name: 'Cloud Storage',
		description: 'Cloud storage and file management solution',
		url: 'https://cloud.zaur.app',
		icon: '☁️',
		supportsIframe: false  // NextCloud blokuje iframe
	},
	{
		id: 'share',
		name: 'File Sharing',
		description: 'Share files with friends and family',
		url: 'https://drive.zaur.app/g/2FbH7cq6YMBqjqeZ',
		icon: '📄',
		supportsIframe: true  // Zakładamy, że również ma ograniczenia
	},
	{
		id: 'kino',
		name: 'Kino',
		description: 'Cinem, what is it really?',
		url: 'https://kino.net.pl',
		icon: '🎬',
		supportsIframe: false,
		openInNewTab: true
	},
	{
		id: 'kompi',
		name: 'Kompi',
		description: 'Computer hardware and software reviews',
		url: 'https://kompi.pl',
		icon: '💻',
		supportsIframe: false,
		openInNewTab: true
	}
];

export function getAppById(id: string): App | undefined {
	return apps.find(app => app.id === id);
} 