import type { JMAPIdentity } from '../jmap/types';

export interface ResolvedSendFrom {
	email: string;
	identity?: JMAPIdentity;
}

/**
 * Resolve the compose store's selected sender ('' means primary) to the
 * identity it belongs to, returning the identity's canonical email casing.
 * Falls back to the raw selection when no identity matches.
 */
export function resolveSendFrom(
	fromEmail: string,
	username: string | null | undefined,
	identities: readonly JMAPIdentity[]
): ResolvedSendFrom {
	const want = (fromEmail || username || '').trim().toLowerCase();
	const identity = identities.find(
		(candidate) => candidate.email?.trim().toLowerCase() === want
	);
	return { email: identity?.email ?? (fromEmail || username || ''), identity };
}
