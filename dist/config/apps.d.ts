interface AppConfig {
	id: string;
	name: string;
	description: string;
	url: string;
	icon: string;
	supportsIframe: boolean;
}

export const apps: AppConfig[];
export function getAppById(id: string): AppConfig | undefined; 