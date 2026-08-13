import { AccessToken } from 'livekit-server-sdk';

/** Invite tokens last a working day so calendar guests can join late. */
export const LIVEKIT_TOKEN_TTL = '12h';

export type LivekitConfig = {
	wsUrl: string;
	apiKey: string;
	apiSecret: string;
};

export type LivekitJoinOptions = {
	room: string;
	identity: string;
	name: string;
};

export function livekitConfigFromEnv(
	privateEnv: Record<string, string | undefined>
): LivekitConfig | null {
	const apiKey = privateEnv.LIVEKIT_API_KEY?.trim() ?? '';
	const apiSecret = privateEnv.LIVEKIT_API_SECRET?.trim() ?? '';
	const wsUrl = normalizeWsUrl(privateEnv.LIVEKIT_URL);
	if (!apiKey || !apiSecret || !wsUrl) return null;
	return { wsUrl, apiKey, apiSecret };
}

export function normalizeWsUrl(raw: string | null | undefined): string {
	const trimmed = raw?.trim() ?? '';
	if (!trimmed) return '';
	const withProtocol = trimmed.includes('://') ? trimmed : `wss://${trimmed}`;
	try {
		const url = new URL(withProtocol);
		if (url.protocol === 'https:') url.protocol = 'wss:';
		else if (url.protocol === 'http:') url.protocol = 'ws:';
		else if (url.protocol !== 'wss:' && url.protocol !== 'ws:') return '';
		url.hash = '';
		url.search = '';
		url.pathname = url.pathname.replace(/\/+$/, '') || '';
		return url.toString().replace(/\/$/, '');
	} catch {
		return '';
	}
}

export async function mintJoinToken(
	config: LivekitConfig,
	options: LivekitJoinOptions
): Promise<string> {
	const token = new AccessToken(config.apiKey, config.apiSecret, {
		identity: options.identity,
		name: options.name,
		ttl: LIVEKIT_TOKEN_TTL
	});
	token.addGrant({
		roomJoin: true,
		room: options.room,
		canPublish: true,
		canSubscribe: true,
		canPublishData: true
	});
	return token.toJwt();
}

/** Display name LiveKit shows in the roster. */
export function livekitDisplayName(account: { displayName?: string; username: string }): string {
	const raw = account.displayName?.trim() || account.username.split('@')[0] || 'user';
	return raw.replace(/[\u0000-\u001f\\/]/g, '').slice(0, 64);
}
