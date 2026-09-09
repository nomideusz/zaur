/**
 * Pull the human-readable reason out of a JMAP Foo/set failure (notUpdated /
 * notCreated / notDestroyed). Stalwart's account-security descriptions are
 * written for the user ("Password is too weak…", wrong current password), so
 * routes can show them instead of a bare "failed". Pure: unit-tested in node.
 */
export function setFailureMessage(data: Record<string, unknown>): string | null {
	for (const key of ['notUpdated', 'notCreated', 'notDestroyed']) {
		const failures = data[key];
		if (!failures || typeof failures !== 'object') continue;
		for (const entry of Object.values(failures as Record<string, unknown>)) {
			if (!entry || typeof entry !== 'object') continue;
			const { description, type } = entry as { description?: unknown; type?: unknown };
			if (typeof description === 'string' && description.trim()) return description.trim();
			if (typeof type === 'string' && type.trim()) return type.trim();
		}
	}
	return null;
}

/** Thrown when Stalwart gave a reason a user can act on. */
export class AccountSecurityError extends Error {
	readonly userMessage: string;
	constructor(userMessage: string) {
		super(userMessage);
		this.userMessage = userMessage;
	}
}
