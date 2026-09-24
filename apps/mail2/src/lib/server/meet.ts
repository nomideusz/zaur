/**
 * Zaur Meet on LiveKit Cloud: who may join a room, and as whom.
 *
 * A room is only its name. The link lives in a calendar event's location as
 * `/meet/{room}` (`@zaur/mail-core/utils/meet`), and webmail 1.0 opens the
 * same rooms, so a link made in either app joins the same call from the other.
 *
 * Env, server only (all three, or Meet is off):
 *   LIVEKIT_URL          wss://….livekit.cloud
 *   LIVEKIT_API_KEY
 *   LIVEKIT_API_SECRET
 */
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import type { SessionData } from '@zaur/server-auth';
export { GUEST_PREFIX } from '#lib/meet/call';

export interface MeetConfig {
	wsUrl: string;
	apiKey: string;
	apiSecret: string;
}

/** Invite tokens last a working day, so a calendar guest can join late. */
const TOKEN_TTL = '12h';

export function meetConfig(env: Record<string, string | undefined> = process.env): MeetConfig | null {
	const apiKey = env.LIVEKIT_API_KEY?.trim() ?? '';
	const apiSecret = env.LIVEKIT_API_SECRET?.trim() ?? '';
	const wsUrl = normalizeWsUrl(env.LIVEKIT_URL);
	return apiKey && apiSecret && wsUrl ? { wsUrl, apiKey, apiSecret } : null;
}

export function normalizeWsUrl(raw: string | null | undefined): string {
	const trimmed = raw?.trim() ?? '';
	if (!trimmed) return '';
	try {
		const url = new URL(trimmed.includes('://') ? trimmed : `wss://${trimmed}`);
		if (url.protocol === 'https:') url.protocol = 'wss:';
		else if (url.protocol === 'http:') url.protocol = 'ws:';
		else if (url.protocol !== 'wss:' && url.protocol !== 'ws:') return '';
		url.hash = '';
		url.search = '';
		return url.toString().replace(/\/+$/, '');
	} catch {
		return '';
	}
}

export async function mintJoinToken(
	config: MeetConfig,
	options: { room: string; identity: string; name: string }
): Promise<string> {
	const token = new AccessToken(config.apiKey, config.apiSecret, {
		identity: options.identity,
		name: options.name,
		ttl: TOKEN_TTL
	});
	token.addGrant({
		roomJoin: true,
		room: options.room,
		canPublish: true,
		canSubscribe: true,
		canPublishData: true,
		// A raised hand is an attribute the participant sets on themselves. The
		// identity stays fixed, so a guest still reads as a guest after a rename.
		canUpdateOwnMetadata: true
	});
	return token.toJwt();
}

/** The name a signed-in account shows in a call. */
export function meetDisplayName(account: Pick<SessionData, 'displayName' | 'username'>): string {
	return cleanName(account.displayName?.trim() || account.username.split('@')[0] || 'user');
}

/** A typed guest name, made safe to show: no control characters, 64 at most. */
export function cleanName(raw: string): string {
	return raw.replace(/[\u0000-\u001f\u007f\\/]/g, '').trim().slice(0, 64);
}

/**
 * Who is in the room right now, by name — the lobby's "Annie and Marek are
 * here". Anyone with the link could join and see the same, so it asks for no
 * session. A room nobody has opened yet does not exist, which reads as empty.
 */
export async function participantNames(config: MeetConfig, room: string): Promise<string[]> {
	const service = new RoomServiceClient(config.wsUrl.replace(/^ws/, 'http'), config.apiKey, config.apiSecret);
	try {
		const list = await service.listParticipants(room);
		return list.map((p) => p.name || p.identity);
	} catch {
		return [];
	}
}
