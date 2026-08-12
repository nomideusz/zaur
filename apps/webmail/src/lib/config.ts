import { env } from '$env/dynamic/public';
import { normalizeJitsiBaseUrl } from '$lib/utils/jitsi';

export const appConfig = {
	appName: env.PUBLIC_APP_NAME || 'Webmail',
	// Short brand for the login header; falls back to the app name.
	brandName: env.PUBLIC_BRAND_NAME || env.PUBLIC_APP_NAME || 'Webmail',
	// No production default: hooks.server.ts fails fast if this is unset in
	// production, so an unconfigured deploy can never silently proxy a stranger's
	// credentials to someone else's mail server.
	jmapServerUrl: (env.PUBLIC_JMAP_SERVER_URL || '').replace(/\/$/, ''),
	// Optional signup service. Empty (the default) hides every "get an address"
	// entry point — self-hosted deploys create accounts in Stalwart directly.
	registerUrl: (env.PUBLIC_REGISTER_URL || '').replace(/\/$/, ''),
	// Optional self-hosted Jitsi base URL (e.g. https://meet.zaur.app). Empty
	// hides the calendar "Video call" control; see infra/meet/.
	jitsiUrl: normalizeJitsiBaseUrl(env.PUBLIC_JITSI_URL)
};
