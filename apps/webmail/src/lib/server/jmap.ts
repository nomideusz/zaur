import { JMAPClient } from '$lib/jmap/client';
import type { SessionData } from './session';
import { decodeJwt, refreshAccessToken } from './oauth';

export async function createConnectedClient(session: SessionData): Promise<JMAPClient> {
	if (session.accessToken && session.refreshToken) {
		const payload = decodeJwt(session.accessToken);
		const now = Math.floor(Date.now() / 1000);
		if (payload && payload.exp && payload.exp - now < 30) {
			console.log(`[Token Refresh] Token for ${session.username} is expiring soon/expired. Refreshing...`);
			const newTokens = await refreshAccessToken(session.refreshToken);
			if (newTokens) {
				session.accessToken = newTokens.accessToken;
				session.refreshToken = newTokens.refreshToken;
				if (session.id) {
					const { updateSessionData } = await import('./session');
					updateSessionData(session.id, session);
					console.log('[Token Refresh] Token refreshed and session updated successfully.');
				}
			} else {
				throw new Error('Unauthorized: Refresh token expired');
			}
		}
	}

	const client = session.accessToken
		? new JMAPClient(session.serverUrl, session.username, session.accessToken, false, true)
		: new JMAPClient(session.serverUrl, session.username, session.password ?? '');
	await client.connect();
	return client;
}
