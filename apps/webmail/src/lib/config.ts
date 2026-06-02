import { env } from '$env/dynamic/public';

export const appConfig = {
	appName: env.PUBLIC_APP_NAME || 'ZAUR Webmail',
	brandName: 'Zaur Mail',
	jmapServerUrl: (env.PUBLIC_JMAP_SERVER_URL || 'https://mail.zaur.app').replace(/\/$/, ''),
	registerUrl: (env.PUBLIC_REGISTER_URL || 'https://register.zaur.app').replace(/\/$/, '')
};
