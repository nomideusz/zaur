import { env } from '$env/dynamic/private';

function registerApiUrl(): string {
	return (env.REGISTER_API_URL || 'https://register.zaur.app').replace(/\/$/, '');
}

export async function registerApiFetch(
	path: string,
	init?: RequestInit
): Promise<Response> {
	const url = `${registerApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
	return fetch(url, {
		...init,
		headers: {
			Accept: 'application/json',
			...(init?.body ? { 'Content-Type': 'application/json' } : {}),
			...init?.headers
		}
	});
}

export function isPasswordResetEnabled(): boolean {
	return env.PASSWORD_RESET_ENABLED !== 'false';
}
