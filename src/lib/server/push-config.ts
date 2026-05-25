import { env } from '$env/dynamic/private';
import webpush from 'web-push';

export function isPushConfigured(): boolean {
	return Boolean(getVapidPublicKey() && getVapidPrivateKey() && getVapidSubject());
}

export function getVapidPublicKey(): string | undefined {
	return env.VAPID_PUBLIC_KEY?.trim() || undefined;
}

function getVapidPrivateKey(): string | undefined {
	return env.VAPID_PRIVATE_KEY?.trim() || undefined;
}

function getVapidSubject(): string | undefined {
	return env.VAPID_SUBJECT?.trim() || undefined;
}

export function configureWebPush(): boolean {
	if (!isPushConfigured()) return false;

	webpush.setVapidDetails(getVapidSubject()!, getVapidPublicKey()!, getVapidPrivateKey()!);
	return true;
}

export { webpush };
