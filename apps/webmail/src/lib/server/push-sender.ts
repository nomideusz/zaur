import { configureWebPush, isPushConfigured, webpush } from '$lib/server/push-config';
import { sendFcmNotification } from '$lib/server/fcm';
import { removePushSubscription, type StoredPushSubscription } from '$lib/server/push-subscriptions';

export interface PushMessage {
	title: string;
	body: string;
	url?: string;
	tag?: string;
	unreadCount?: number;
}

/** `gone` means the push service rejected the endpoint permanently and the subscription was deleted. */
export type PushSendResult = 'sent' | 'failed' | 'gone';

export async function sendPushNotification(
	record: StoredPushSubscription,
	message: PushMessage
): Promise<PushSendResult> {
	if (record.platform === 'fcm' && record.fcmToken) {
		const result = await sendFcmNotification(record.fcmToken, {
			title: message.title,
			body: message.body,
			url: message.url ?? '/',
			tag: message.tag ?? 'zaur-new-mail'
		});
		if (result === 'gone') {
			await removePushSubscription(record.id);
			console.warn('[push] FCM token gone, removed:', record.id);
		}
		return result;
	}

	if (!record.subscription) return 'failed';
	if (!isPushConfigured() || !configureWebPush()) return 'failed';

	try {
		await webpush.sendNotification(
			record.subscription,
			JSON.stringify({
				title: message.title,
				body: message.body,
				url: message.url ?? '/',
				tag: message.tag ?? 'zaur-new-mail',
				unreadCount: message.unreadCount
			})
		);
		return 'sent';
	} catch (error) {
		const statusCode =
			typeof error === 'object' &&
			error !== null &&
			'statusCode' in error &&
			typeof error.statusCode === 'number'
				? error.statusCode
				: undefined;

		if (statusCode === 404 || statusCode === 410) {
			await removePushSubscription(record.id);
			console.warn('[push] Subscription gone, removed:', record.id);
			return 'gone';
		}

		console.warn('[push] Failed to deliver notification:', error);
		return 'failed';
	}
}
