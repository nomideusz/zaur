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

const TOPIC = 'webmail:active-sessions';
const sessions = new Map<string, ActiveSession>();

function requireUser(ctx: LiveContext): LiveUser {
	if (!ctx.user?.username) {
		throw new LiveError('UNAUTHORIZED', 'Login required');
	}
	return ctx.user;
}

function sessionKey(ctx: LiveContext, user: LiveUser): string {
	return `${user.sessionId}:${ctx.requestId ?? 'connection'}`;
}

function upsertSession(ctx: LiveContext): ActiveSession {
	const user = requireUser(ctx);
	const key = sessionKey(ctx, user);
	const existing = sessions.get(key);
	const session = {
		key,
		username: user.username,
		connectedAt: existing?.connectedAt ?? new Date().toISOString()
	};
	sessions.set(key, session);
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
		return [...sessions.values()];
	},
	{
		merge: 'presence',
		onUnsubscribe(ctx: LiveContext, topic: string) {
			const user = requireUser(ctx);
			const key = sessionKey(ctx, user);
			sessions.delete(key);
			ctx.publish(topic, 'leave', { key });
		}
	}
);
