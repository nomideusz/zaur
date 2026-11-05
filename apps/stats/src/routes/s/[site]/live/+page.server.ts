import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteById } from '#lib/sites';
import { readWho } from '#lib/view';

export const load: PageServerLoad = async ({ params, url }) => {
	const site = params.site === 'all' ? null : siteById(params.site);
	if (params.site !== 'all' && !site) error(404, 'No such site');
	return { site: params.site, name: site?.name ?? 'All sites', who: readWho(url.searchParams) };
};
