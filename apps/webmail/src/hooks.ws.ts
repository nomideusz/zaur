import type { Cookies } from '@sveltejs/kit';
import {
	COOKIE_NAME,
	readSession,
	readSessionById,
	unsealSession,
	type SessionData
} from '$lib/server/session';

export { close, message, unsubscribe } from 'svelte-realtime/server';

interface LiveUser {
	id: string;
	sessionId: string;
	username: string;
}

type UpgradeCookies = Record<string, string>;

function liveUserFromSession(session: SessionData | null): LiveUser | false {
	if (!session) return false;

	const sessionId = session.id ?? session.username;
	return {
		id: session.username,
		sessionId,
		username: session.username
	};
}

function readUpgradeSession(cookies: UpgradeCookies): SessionData | null {
	const token = cookies[COOKIE_NAME];
	if (!token) return null;

	const direct = unsealSession(token);
	if (direct) {
		if (direct.id) readSessionById(direct.id);
		return direct;
	}

	return readSessionById(token);
}

export function upgrade({ cookies }: { cookies: UpgradeCookies }) {
	return liveUserFromSession(readUpgradeSession(cookies));
}

export function authenticate({ cookies }: { cookies: Cookies }) {
	return Boolean(liveUserFromSession(readSession(cookies)));
}
