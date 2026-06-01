import { redirect } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import type { PageServerLoad } from './$types';

/** Signup lives on register.zaur.app — preserve invitation query params. */
export const load: PageServerLoad = ({ url }) => {
	const target = new URL(appConfig.registerUrl);
	url.searchParams.forEach((value, key) => {
		target.searchParams.set(key, value);
	});
	redirect(302, target.toString());
};
