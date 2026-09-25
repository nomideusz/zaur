/**
 * One-off, at the webmail → mail2 cutover: copy webmail 1.0's browser push
 * subscriptions (a JSON file) into mail2's `push_subscriptions` table, so
 * people with notifications on keep getting them without reopening the app.
 * Only works if mail2 runs with webmail's VAPID keys, since each subscription
 * is tied to the key it was made with. Skips FCM (Android shell) records and
 * records whose session is gone; rows mail2 already has are left alone.
 *
 * Inside the mail2 container (same volume as webmail), then restart mail2 so
 * its push watcher picks the rows up:
 *   docker exec -i <mail2 container> node - < apps/mail2/scripts/import-webmail-push.mjs
 * Env: STORE_DB_PATH, PUSH_SUBSCRIPTIONS_PATH (default /app/.data/…), DRY_RUN=1.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const storePath = process.env.STORE_DB_PATH?.trim() || '/app/.data/store.sqlite';
const jsonPath = process.env.PUSH_SUBSCRIPTIONS_PATH?.trim() || '/app/.data/push-subscriptions.json';
const dryRun = process.env.DRY_RUN === '1';

const records = Object.values(JSON.parse(readFileSync(jsonPath, 'utf8')));
const db = new DatabaseSync(storePath);
db.exec('PRAGMA busy_timeout = 5000');
const sessionExists = db.prepare('SELECT 1 FROM sessions WHERE id = ?');
const insert = db.prepare(
	`INSERT INTO push_subscriptions (id, session_id, subscription, muted_accounts, created_at, updated_at)
	 VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`
);

const counts = { imported: 0, alreadyThere: 0, fcm: 0, noSession: 0, invalid: 0 };
for (const record of records) {
	const sub = record.subscription;
	if ((record.platform ?? 'webpush') !== 'webpush') counts.fcm++;
	else if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) counts.invalid++;
	else if (!sessionExists.get(record.sessionId)) counts.noSession++;
	else {
		const id = createHash('sha256').update(sub.endpoint).digest('hex').slice(0, 32);
		const time = (iso) => Date.parse(iso) || Date.now();
		const row = [
			id,
			record.sessionId,
			JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }),
			JSON.stringify(record.mutedAccounts ?? []),
			time(record.createdAt),
			time(record.updatedAt)
		];
		const changes = dryRun ? 1 : insert.run(...row).changes;
		counts[changes ? 'imported' : 'alreadyThere']++;
	}
}
console.log(`${records.length} webmail records${dryRun ? ' (dry run)' : ''}:`, counts);
