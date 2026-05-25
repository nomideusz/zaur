import { configureWebPush, isPushConfigured, webpush } from '$lib/server/push-config';
import { removePushSubscription, type StoredPushSubscription } from '$lib/server/push-subscriptions';

export interface PushMessage {
	title: string;
	body: string;
	url?: string;
	tag?: string;
}

export async function sendPushNotification(
	record: StoredPushSubscription,
	message: PushMessage
): Promise<boolean> {
	if (!isPushConfigured() || !configureWebPush()) return false;

	try {
		await webpush.sendNotification(
			record.subscription,
			JSON.stringify({
				title: message.title,
				body: message.body,
				url: message.url ?? '/mail/inbox',
				tag: message.tag ?? 'zaur-new-mail'
			})
		);
		return true;
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
		}

		console.warn('[push] Failed to deliver notification:', error);
		return false;
	}
}
