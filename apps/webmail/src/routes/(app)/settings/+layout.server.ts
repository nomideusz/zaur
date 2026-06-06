import { redirect } from '@sveltejs/kit';
import { settingsRedirect } from '$lib/mail/config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ url }) => {
	const target = settingsRedirect(url.pathname);
	if (target && target !== url.pathname) {
		redirect(307, `${target}${url.search}${url.hash}`);
	}
	return {};
};
