import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	checkRateLimitRow,
	consumeOauthFlowRow,
	deleteSessionRow,
	getSessionRow,
	hasSessionRow,
	hasStepUpProof,
	importLegacySessionsJson,
	openStoreDb,
	listSessionAccountRows,
	pruneOauthFlowRows,
	pruneRateLimitRows,
	pruneSessionRows,
	putOauthFlowRow,
	putSessionRow,
	putStepUpProof,
	syncSessionAccountRows,
	touchSessionRow
} from '../src/lib/server/store-db.ts';

const DAY = 24 * 60 * 60 * 1000;

function freshDb() {
	return openStoreDb(':memory:');
}

describe('sessions table', () => {
	it('round-trips a session row', () => {
		const db = freshDb();
		const now = Date.now();
		putSessionRow(db, {
			id: 'abc',
			username: 'nom@zaur.app',
			sealedData: 'sealed',
			createdAt: now,
			updatedAt: now,
			expiresAt: null
		});
		const row = getSessionRow(db, 'abc');
		assert.ok(row);
		assert.equal(row.username, 'nom@zaur.app');
		assert.equal(row.sealedData, 'sealed');
		assert.equal(row.expiresAt, null);
		assert.equal(hasSessionRow(db, 'abc'), true);
		assert.equal(hasSessionRow(db, 'nope'), false);
	});

	it('upsert preserves createdAt and replaces payload', () => {
		const db = freshDb();
		const t0 = 1000;
		putSessionRow(db, { id: 'x', username: 'a', sealedData: 's1', createdAt: t0, updatedAt: t0, expiresAt: null });
		putSessionRow(db, { id: 'x', username: 'b', sealedData: 's2', createdAt: 9999, updatedAt: 2000, expiresAt: 3000 });
		const row = getSessionRow(db, 'x');
		assert.ok(row);
		assert.equal(row.createdAt, t0, 'createdAt survives upsert');
		assert.equal(row.sealedData, 's2');
		assert.equal(row.expiresAt, 3000);
	});

	it('touch bumps updatedAt only', () => {
		const db = freshDb();
		putSessionRow(db, { id: 'x', username: 'a', sealedData: 's', createdAt: 1, updatedAt: 1, expiresAt: null });
		touchSessionRow(db, 'x', 500);
		const row = getSessionRow(db, 'x');
		assert.equal(row?.updatedAt, 500);
		assert.equal(row?.sealedData, 's');
	});

	it('delete removes the row', () => {
		const db = freshDb();
		putSessionRow(db, { id: 'x', username: 'a', sealedData: 's', createdAt: 1, updatedAt: 1, expiresAt: null });
		deleteSessionRow(db, 'x');
		assert.equal(getSessionRow(db, 'x'), null);
	});

	it('prune drops explicit-expiry and idle sessions, keeps live ones', () => {
		const db = freshDb();
		const now = Date.now();
		putSessionRow(db, { id: 'expired', username: '', sealedData: 's', createdAt: now, updatedAt: now, expiresAt: now - 1 });
		putSessionRow(db, { id: 'idle', username: '', sealedData: 's', createdAt: now - 40 * DAY, updatedAt: now - 40 * DAY, expiresAt: null });
		putSessionRow(db, { id: 'live', username: '', sealedData: 's', createdAt: now, updatedAt: now, expiresAt: now + DAY });
		const pruned = pruneSessionRows(db, now, 30 * DAY);
		assert.equal(pruned, 2);
		assert.equal(getSessionRow(db, 'live')?.id, 'live');
		assert.equal(getSessionRow(db, 'expired'), null);
		assert.equal(getSessionRow(db, 'idle'), null);
	});
});

describe('legacy JSON import', () => {
	it('imports records once and renames the file', () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'zaur-store-'));
		const jsonPath = path.join(dir, 'sessions.json');
		writeFileSync(
			jsonPath,
			JSON.stringify({
				a: {
					id: 'a',
					username: 'u@zaur.app',
					sealedData: 'sealed-a',
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-06-01T00:00:00.000Z',
					expiresAt: '2026-12-01T00:00:00.000Z'
				},
				junk: { notASession: true }
			})
		);
		const db = freshDb();
		const imported = importLegacySessionsJson(db, jsonPath);
		assert.equal(imported, 1);
		const row = getSessionRow(db, 'a');
		assert.ok(row);
		assert.equal(row.sealedData, 'sealed-a');
		assert.equal(row.expiresAt, Date.parse('2026-12-01T00:00:00.000Z'));
		assert.equal(existsSync(jsonPath), false, 'json renamed away');
		assert.equal(existsSync(`${jsonPath}.imported`), true);
		// Re-running is a no-op.
		assert.equal(importLegacySessionsJson(db, jsonPath), 0);
	});

	it('existing sqlite rows win over the import', () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'zaur-store-'));
		const jsonPath = path.join(dir, 'sessions.json');
		writeFileSync(
			jsonPath,
			JSON.stringify({
				a: { id: 'a', username: 'old', sealedData: 'stale', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
			})
		);
		const db = freshDb();
		putSessionRow(db, { id: 'a', username: 'new', sealedData: 'fresh', createdAt: 1, updatedAt: 1, expiresAt: null });
		importLegacySessionsJson(db, jsonPath);
		assert.equal(getSessionRow(db, 'a')?.sealedData, 'fresh');
	});
});

describe('OAuth flows', () => {
	it('consumes a live flow exactly once', () => {
		const db = freshDb();
		putOauthFlowRow(db, { stateHash: 'state', sealedData: 'sealed', expiresAt: 2000 });
		assert.equal(consumeOauthFlowRow(db, 'state', 1000)?.sealedData, 'sealed');
		assert.equal(consumeOauthFlowRow(db, 'state', 1000), null);
	});

	it('does not return expired flows and prunes them', () => {
		const db = freshDb();
		putOauthFlowRow(db, { stateHash: 'expired', sealedData: 'old', expiresAt: 999 });
		putOauthFlowRow(db, { stateHash: 'live', sealedData: 'new', expiresAt: 2000 });
		assert.equal(consumeOauthFlowRow(db, 'expired', 1000), null);
		assert.equal(pruneOauthFlowRows(db, 1000), 1);
		assert.equal(consumeOauthFlowRow(db, 'live', 1000)?.sealedData, 'new');
	});
});

describe('account security state', () => {
	it('expires step-up proofs after five-minute-style windows', () => {
		const db = freshDb();
		putStepUpProof(db, 'session', 'user@zaur.app', 1000, 2000);
		assert.equal(hasStepUpProof(db, 'session', 'user@zaur.app', 1999), true);
		assert.equal(hasStepUpProof(db, 'session', 'user@zaur.app', 2001), false);
		assert.equal(hasStepUpProof(db, 'session', 'sibling@zaur.app', 1500), false);
	});

	it('indexes each account in a multi-account session independently', () => {
		const db = freshDb();
		putSessionRow(db, {
			id: 'session',
			username: 'first@zaur.app',
			sealedData: 'sealed',
			createdAt: 1000,
			updatedAt: 1000,
			expiresAt: null
		});
		syncSessionAccountRows(db, 'session', ['first@zaur.app', 'second@zaur.app'], 1000);
		assert.equal(listSessionAccountRows(db, 'first@zaur.app').length, 1);
		assert.equal(listSessionAccountRows(db, 'second@zaur.app').length, 1);
		syncSessionAccountRows(db, 'session', ['second@zaur.app'], 2000);
		assert.equal(listSessionAccountRows(db, 'first@zaur.app').length, 0);
		assert.equal(listSessionAccountRows(db, 'second@zaur.app')[0].updatedAt, 2000);
	});
});

describe('rate limits', () => {
	it('allows up to the limit inside a window, then blocks with retry-after', () => {
		const db = freshDb();
		const now = 1_000_000;
		for (let i = 0; i < 3; i++) {
			assert.equal(checkRateLimitRow(db, 'k', 3, 60_000, now + i).allowed, true, `attempt ${i + 1}`);
		}
		const blocked = checkRateLimitRow(db, 'k', 3, 60_000, now + 3);
		assert.equal(blocked.allowed, false);
		assert.ok(blocked.retryAfterSec >= 1 && blocked.retryAfterSec <= 60);
	});

	it('opens a fresh window after reset', () => {
		const db = freshDb();
		const now = 1_000_000;
		checkRateLimitRow(db, 'k', 1, 1000, now);
		assert.equal(checkRateLimitRow(db, 'k', 1, 1000, now + 1).allowed, false);
		assert.equal(checkRateLimitRow(db, 'k', 1, 1000, now + 1000).allowed, true, 'window lapsed');
	});

	it('keys are independent', () => {
		const db = freshDb();
		const now = 1_000_000;
		checkRateLimitRow(db, 'a', 1, 1000, now);
		assert.equal(checkRateLimitRow(db, 'b', 1, 1000, now).allowed, true);
	});

	it('prune drops lapsed windows only', () => {
		const db = freshDb();
		const now = 1_000_000;
		checkRateLimitRow(db, 'old', 5, 1000, now - 5000);
		checkRateLimitRow(db, 'live', 5, 60_000, now);
		pruneRateLimitRows(db, now);
		// Old key starts a fresh window (count resets to 1 → allowed even with limit 1).
		assert.equal(checkRateLimitRow(db, 'old', 1, 1000, now).allowed, true);
		// Live key kept its count.
		assert.equal(checkRateLimitRow(db, 'live', 1, 60_000, now + 1).allowed, false);
	});
});
