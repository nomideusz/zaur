import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { finishLogin, type LoginTransaction } from '#lib/server/oidc';
import { isAdmin, unseal, writeUser } from '#lib/server/session';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const tx = unseal<LoginTransaction>(cookies.get('zaur_stats_login'));
	cookies.delete('zaur_stats_login', { path: '/auth' });
	const code = url.searchParams.get('code');
	// A stale tab or a second try: start over rather than show an error.
	if (!tx || !code || url.searchParams.get('state') !== tx.state) redirect(303, `/auth/login?next=${encodeURIComponent(tx?.next ?? '/')}`);

	let user;
	try {
		user = await finishLogin(url.origin, code, tx);
	} catch (cause) {
		console.error('[auth] sign-in failed', cause);
		error(502, 'Signing in through Zaur did not work. Try again in a moment.');
	}
	if (!isAdmin(user.email)) error(403, `${user.email} cannot read these stats.`);
	writeUser(cookies, user, url.protocol === 'https:');
	redirect(303, tx.next);
};
