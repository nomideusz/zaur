/**
 * Durable, per-user record of the accounts a user has linked together, so the
 * full set is restored on a fresh "Remember me" sign-in — on *any* device, not
 * just within the lifetime of one session cookie (which `sessions.json` is).
 *
 * The group is symmetric: it is written under *every* member's email key, so
 * signing in as any member restores the whole set. Tokens/passwords live sealed
 * at rest — the same exposure as `sessions.json` — and the group is cleared on
 * explicit sign-out. Synchronous file I/O mirrors `session.ts` so the session
 * mutators that call it can stay synchronous.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import { sealSession, unsealSession } from './session-crypto';
import {
	accountKey,
	bareAccount,
	mergeLinkedGroup,
	removeFromGroup,
	type SessionData
} from './session-model';

interface LinkRecord {
	/** The full group (this key's own account included), sealed. */
	sealed: string;
	updatedAt: string;
}

type LinkStore = Record<string, LinkRecord>;

const DEFAULT_STORE_PATH = path.join(process.cwd(), '.data', 'linked-accounts.json');

function getStorePath(): string {
	return env.LINKED_ACCOUNTS_PATH?.trim() || DEFAULT_STORE_PATH;
}

function readStore(): LinkStore {
	try {
		const raw = readFileSync(getStorePath(), 'utf8');
		const parsed = JSON.parse(raw) as LinkStore;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

function writeStore(store: LinkStore): void {
	const storePath = getStorePath();
	mkdirSync(path.dirname(storePath), { recursive: true });
	// Write-then-rename so a crash or concurrent reader never sees a truncated file.
	const tmpPath = `${storePath}.${randomBytes(6).toString('hex')}.tmp`;
	writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
	renameSync(tmpPath, storePath);
}

function unsealGroup(record: LinkRecord | undefined): SessionData[] {
	if (!record) return [];
	const data = unsealSession(record.sealed);
	return Array.isArray(data) ? (data as SessionData[]) : [];
}

function sealGroup(group: SessionData[], now: string): LinkRecord {
	return { sealed: sealSession(group.map(bareAccount)), updatedAt: now };
}

/**
 * Persist the session's account group under every member's email. A group only
 * exists with ≥2 accounts; with fewer there is nothing to link, so any stale
 * single-member records are cleared instead. Caller gates this on "Remember me".
 */
export function rememberLinkedAccounts(accounts: SessionData[]): void {
	const group = accounts.map(bareAccount);
	const store = readStore();

	if (group.length < 2) {
		// Nothing to remember — drop any record we previously wrote for these emails.
		let changed = false;
		for (const acct of group) {
			const k = accountKey(acct.username);
			if (store[k]) {
				delete store[k];
				changed = true;
			}
		}
		if (changed) writeStore(store);
		return;
	}

	const record = sealGroup(group, new Date().toISOString());
	for (const acct of group) {
		store[accountKey(acct.username)] = record;
	}
	writeStore(store);
}

/**
 * The account list to restore for a fresh login: the just-authenticated account
 * (with this login's fresh tokens) plus the rest of its stored group. Returns
 * just the fresh account when it belongs to no group.
 */
export function restoreLinkedAccounts(fresh: SessionData): SessionData[] {
	const store = readStore();
	const group = unsealGroup(store[accountKey(fresh.username)]);
	return mergeLinkedGroup(fresh, group);
}

/**
 * Drop one account from every group it appears in (and delete its own record).
 * Groups that fall below two members are removed entirely. Used when an account
 * is intentionally removed from the session.
 */
export function forgetLinkedAccount(key: string): void {
	const k = accountKey(key);
	const store = readStore();
	const now = new Date().toISOString();
	let changed = false;

	for (const [memberKey, record] of Object.entries(store)) {
		if (memberKey === k) {
			delete store[memberKey];
			changed = true;
			continue;
		}
		const group = unsealGroup(record);
		const next = removeFromGroup(group, k);
		if (next.length === group.length) continue;
		if (next.length < 2) delete store[memberKey];
		else store[memberKey] = sealGroup(next, now);
		changed = true;
	}

	if (changed) writeStore(store);
}

/** Forget an entire group on explicit sign-out: delete every member's record. */
export function forgetLinkedAccounts(accounts: SessionData[]): void {
	const store = readStore();
	let changed = false;
	for (const acct of accounts) {
		const k = accountKey(acct.username);
		if (store[k]) {
			delete store[k];
			changed = true;
		}
	}
	if (changed) writeStore(store);
}
