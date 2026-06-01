import { redirect, type RequestHandler } from '@sveltejs/kit';

/** Legacy redirect from /setup-passkey/start → in-page setup. */
export const GET: RequestHandler = async ({ url }) => {
	const email = url.searchParams.get('email')?.trim().toLowerCase();
	const token = url.searchParams.get('token')?.trim();
	const params = new URLSearchParams();
	if (email) params.set('email', email);
	if (token) params.set('token', token);
	redirect(303, `/setup-passkey?${params.toString()}`);
};
