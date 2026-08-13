import { normalizeEmail } from '@zaur/mail-core/jmap/account';
import type { Mailbox, MessagePreview } from '@zaur/mail-core/types/mail';

const USER_KEY = 'zaur:boot-user';
const SNAPSHOT_PREFIX = 'zaur:boot:';
const MAX_LIST = 20;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface BootSnapshot {
	username: string;
	mailboxes: Mailbox[];
	lists: Record<string, MessagePreview[]>;
	savedAt: number;
}

function snapshotKey(username: string): string {
	return `${SNAPSHOT_PREFIX}${normalizeEmail(username)}`;
}

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

function readJson<T>(key: string): T | null {
	if (!canUseStorage()) return null;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function writeJson(key: string, value: unknown): void {
	if (!canUseStorage()) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Quota / private mode — skip; the RxDB cache still covers later visits.
	}
}

export function lastBootUsername(): string | null {
	const stored = readJson<string>(USER_KEY);
	return stored?.trim() ? stored : null;
}

export function parseBootSnapshot(
	raw: unknown,
	expectedUser?: string | null,
	now = Date.now()
): BootSnapshot | null {
	if (!raw || typeof raw !== 'object') return null;
	const snapshot = raw as Partial<BootSnapshot>;
	if (!snapshot.username?.trim() || !Array.isArray(snapshot.mailboxes)) return null;
	if (typeof snapshot.savedAt !== 'number' || now - snapshot.savedAt > MAX_AGE_MS) {
		return null;
	}
	if (
		expectedUser?.trim() &&
		normalizeEmail(snapshot.username) !== normalizeEmail(expectedUser)
	) {
		return null;
	}
	return {
		username: snapshot.username,
		mailboxes: snapshot.mailboxes,
		lists: snapshot.lists && typeof snapshot.lists === 'object' ? snapshot.lists : {},
		savedAt: snapshot.savedAt
	};
}

export function readBootSnapshot(username?: string | null): BootSnapshot | null {
	const user = username?.trim() || lastBootUsername();
	if (!user) return null;
	return parseBootSnapshot(readJson<unknown>(snapshotKey(user)), user);
}

export function writeBootSnapshot(username: string, patch: Partial<Omit<BootSnapshot, 'username' | 'savedAt'>>): void {
	const user = username.trim();
	if (!user) return;

	const current = readBootSnapshot(user) ?? {
		username: user,
		mailboxes: [],
		lists: {},
		savedAt: 0
	};

	const next: BootSnapshot = {
		username: user,
		mailboxes: patch.mailboxes ?? current.mailboxes,
		lists: { ...current.lists, ...(patch.lists ?? {}) },
		savedAt: Date.now()
	};

	if (patch.lists) {
		for (const [routeId, messages] of Object.entries(patch.lists)) {
			next.lists[routeId] = messages.slice(0, MAX_LIST);
		}
	}

	writeJson(snapshotKey(user), next);
	writeJson(USER_KEY, normalizeEmail(user));
}

export function clearBootSnapshot(username?: string | null): void {
	if (!canUseStorage()) return;
	try {
		if (username?.trim()) {
			localStorage.removeItem(snapshotKey(username));
			if (lastBootUsername() && normalizeEmail(lastBootUsername()!) === normalizeEmail(username)) {
				localStorage.removeItem(USER_KEY);
			}
			return;
		}
		const user = lastBootUsername();
		if (user) localStorage.removeItem(snapshotKey(user));
		localStorage.removeItem(USER_KEY);
	} catch {
		// Ignore storage failures.
	}
}

export { MAX_LIST as BOOT_SNAPSHOT_LIST_LIMIT };
