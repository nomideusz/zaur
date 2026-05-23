import { PUBLIC_APP_NAME, PUBLIC_JMAP_SERVER_URL } from '$env/static/public';

export const appConfig = {
	appName: PUBLIC_APP_NAME || 'ZAUR Webmail',
	jmapServerUrl: (PUBLIC_JMAP_SERVER_URL || 'https://mail.zaur.app').replace(/\/$/, '')
};
