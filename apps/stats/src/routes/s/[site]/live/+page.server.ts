import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteById } from '#lib/sites';
import type { Who } from '#lib/server/report';

export const load: PageServerLoad = async ({ params, url }) => {
	const site = params.site === 'all' ? null : siteById(params.site);
	if (params.site !== 'all' && !site) error(404, 'No such site');
	const w = url.searchParams.get('who');
	const who: Who = w === 'mine' ? 'mine' : w === 'all' ? 'all' : 'others';
	return { site: params.site, name: site?.name ?? 'All sites', who };
};
