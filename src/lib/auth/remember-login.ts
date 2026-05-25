import { browser } from '$app/environment';

const REMEMBER_ME_KEY = 'zaur:remember-me';
const REMEMBERED_EMAIL_KEY = 'zaur:remembered-email';

export function loadRememberedLogin(): { email: string; rememberMe: boolean } {
	if (!browser) return { email: '', rememberMe: false };

	const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
	const email = rememberMe ? (localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '') : '';
	return { email, rememberMe };
}

export function saveRememberedLogin(email: string, rememberMe: boolean): void {
	if (!browser) return;

	if (rememberMe && email.trim()) {
		localStorage.setItem(REMEMBER_ME_KEY, 'true');
		localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
		return;
	}

	localStorage.removeItem(REMEMBER_ME_KEY);
	localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}
