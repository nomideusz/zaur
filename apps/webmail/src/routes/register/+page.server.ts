import { redirect } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import type { PageServerLoad } from './$types';

/** Signup lives on the external register service — preserve invitation query
 * params. Without PUBLIC_REGISTER_URL there is nowhere to send people. */
export const load: PageServerLoad = ({ url }) => {
	if (!appConfig.registerUrl) {
		redirect(302, '/login');
	}
	const target = new URL(appConfig.registerUrl);
	url.searchParams.forEach((value, key) => {
		target.searchParams.set(key, value);
	});
	redirect(302, target.toString());
};
