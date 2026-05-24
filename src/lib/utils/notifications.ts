import { browser } from '$app/environment';

export function canUseBrowserNotifications(): boolean {
	return browser && 'Notification' in window;
}

export function browserNotificationPermission(): NotificationPermission | null {
	if (!canUseBrowserNotifications()) return null;
	return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | null> {
	if (!canUseBrowserNotifications()) return null;
	if (Notification.permission !== 'default') return Notification.permission;
	return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string): void {
	if (!canUseBrowserNotifications() || Notification.permission !== 'granted') return;

	try {
		new Notification(title, { body, tag: 'zaur-new-mail' });
	} catch {
		// Some browsers block notifications outside a user gesture
	}
}
