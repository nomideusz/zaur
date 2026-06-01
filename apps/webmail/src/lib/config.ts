import { PUBLIC_APP_NAME, PUBLIC_JMAP_SERVER_URL, PUBLIC_REGISTER_URL } from '$env/static/public';

export const appConfig = {
	appName: PUBLIC_APP_NAME || 'ZAUR Webmail',
	brandName: 'Zaur Mail',
	jmapServerUrl: (PUBLIC_JMAP_SERVER_URL || 'https://mail.zaur.app').replace(/\/$/, ''),
	registerUrl: (PUBLIC_REGISTER_URL || 'https://register.zaur.app').replace(/\/$/, '')
};
