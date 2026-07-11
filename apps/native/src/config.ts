// ponytail: reuses webmail's OAuth client registration. Stalwart returns the
// auth code in the /api/auth JSON response (no redirect ever happens), so the
// redirectUri only has to match the registered client. Register a dedicated
// 'zaur-native' public client when store release nears.
export const config = {
	issuer: 'https://mail.zaur.app',
	oauthClientId: 'webmail',
	oauthRedirectUri: 'https://webmail.zaur.app/api/auth/oauth/callback',
	registerUrl: 'https://register.zaur.app'
};
