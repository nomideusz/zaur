export const apps = [
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
		supportsIframe: false  // Zakładamy, że również ma ograniczenia
	}
];

export function getAppById(id) {
	return apps.find(app => app.id === id);
} 