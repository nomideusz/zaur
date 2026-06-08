import { guard, live, LiveError } from 'svelte-realtime/server';

interface LiveUser {
	id: string;
	sessionId: string;
	username: string;
}

interface LiveContext {
	user?: LiveUser;
	requestId?: string;
	publish: (
		topic: string,
		event: 'join' | 'leave',
		data: ActiveSession | { key: string }
	) => void;
}

export interface ActiveSession {
	key: string;
	username: string;
	connectedAt: string;
}

interface SessionEntry {
	session: ActiveSession;
	connections: Set<string>;
}

const TOPIC = 'webmail:active-sessions';
const sessions = new Map<string, SessionEntry>();

function requireUser(ctx: LiveContext): LiveUser {
	if (!ctx.user?.username) {
		throw new LiveError('UNAUTHORIZED', 'Login required');
	}
	return ctx.user;
}

function sessionKey(user: LiveUser): string {
	return user.sessionId;
}

function connectionKey(ctx: LiveContext, user: LiveUser): string {
	return `${user.sessionId}:${ctx.requestId ?? 'connection'}`;
}

function upsertSession(ctx: LiveContext): ActiveSession {
	const user = requireUser(ctx);
	const key = sessionKey(user);
	const existing = sessions.get(key);
	const session = {
		key,
		username: user.username,
		connectedAt: existing?.session.connectedAt ?? new Date().toISOString()
	};
	const connections = existing?.connections ?? new Set<string>();
	connections.add(connectionKey(ctx, user));
	sessions.set(key, { session, connections });
	return session;
}

export const _guard = guard((ctx: LiveContext) => {
	requireUser(ctx);
});

export const activeSessions = live.stream(
	TOPIC,
	async (ctx: LiveContext) => {
		const session = upsertSession(ctx);
		ctx.publish(TOPIC, 'join', session);
		return [...sessions.values()].map((entry) => entry.session);
	},
	{
		merge: 'presence',
		onUnsubscribe(ctx: LiveContext, topic: string) {
			const user = requireUser(ctx);
			const key = sessionKey(user);
			const entry = sessions.get(key);
			if (!entry) return;

			entry.connections.delete(connectionKey(ctx, user));
			if (entry.connections.size > 0) return;

			sessions.delete(key);
			ctx.publish(topic, 'leave', { key });
		}
	}
);
