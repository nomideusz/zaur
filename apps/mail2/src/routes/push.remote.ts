import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import {
	accountKey,
	deletePushSubscription,
	getPushSubscription,
	getStoreDb,
	listPushSubscriptions,
	putPushSubscription,
	setPushSubscriptionMuted
} from '@zaur/server-auth';
import { requireSession } from '#lib/server/account';
import { isAllowedPushEndpoint, pushPublicKey, pushSubscriptionId } from '#lib/server/push';
import { pushWatcher } from '#lib/server/push-watcher';

/** `null` when this deployment has no VAPID keys: the settings card says so. */
export const pushConfig = query(async () => ({ publicKey: pushPublicKey() }));

const subscription = v.object({
	endpoint: v.pipe(v.string(), v.maxLength(2048)),
	keys: v.object({
		p256dh: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
		auth: v.pipe(v.string(), v.minLength(1), v.maxLength(256))
	})
});

/** Register this browser; also called on every app load, which keeps the row fresh. */
export const subscribePush = command(subscription, async (input) => {
	const { session } = requireSession();
	if (!pushPublicKey()) error(503, 'Notifications are not configured on this server');
	if (!isAllowedPushEndpoint(input.endpoint)) error(400, 'Unsupported push service');
	const db = getStoreDb();
	const id = pushSubscriptionId(input.endpoint);
	putPushSubscription(db, {
		id,
		sessionId: session.id,
		subscription: JSON.stringify({ endpoint: input.endpoint, keys: input.keys })
	});
	// A session is one browser, so any other row of it is that browser's old
	// subscription: from webmail.zaur.app before mail moved to mail.zaur.app
	// (the cookie spans both), or an endpoint the push service has replaced.
	// Left in place, every new message would notify twice. Its mutes carry over.
	const others = listPushSubscriptions(db).filter((row) => row.sessionId === session.id && row.id !== id);
	if (others.length) {
		if (!getPushSubscription(db, id)?.mutedAccounts.length && others[0].mutedAccounts.length) {
			setPushSubscriptionMuted(db, id, others[0].mutedAccounts);
		}
		for (const row of others) deletePushSubscription(db, row.id);
	}
	pushWatcher.sync();
});

/** A row belongs to the session that registered it; anyone else's is left alone. */
export const unsubscribePush = command(v.object({ endpoint: v.string() }), async ({ endpoint }) => {
	const { session } = requireSession();
	const db = getStoreDb();
	const id = pushSubscriptionId(endpoint);
	if (getPushSubscription(db, id)?.sessionId !== session.id) return;
	deletePushSubscription(db, id);
	pushWatcher.sync();
});

const endpoint = v.pipe(v.string(), v.maxLength(2048));

/** The accounts this device keeps quiet about; the session's other accounts notify. */
export const pushMutes = query(v.object({ endpoint }), async ({ endpoint }) => {
	const { session } = requireSession();
	const row = getPushSubscription(getStoreDb(), pushSubscriptionId(endpoint));
	return row?.sessionId === session.id ? row.mutedAccounts : [];
});

export const setPushMutes = command(
	v.object({ endpoint, mutedAccounts: v.pipe(v.array(v.string()), v.maxLength(50)) }),
	async ({ endpoint, mutedAccounts }) => {
		const { session } = requireSession();
		const db = getStoreDb();
		const id = pushSubscriptionId(endpoint);
		if (getPushSubscription(db, id)?.sessionId !== session.id) error(404, 'Notifications are off on this device');
		const signedIn = new Set(session.accounts.map((account) => accountKey(account.username)));
		setPushSubscriptionMuted(db, id, [...new Set(mutedAccounts)].filter((key) => signedIn.has(key)));
		// The watcher stops (or starts) that account's stream now, not at the next restart.
		pushWatcher.sync();
	}
);
