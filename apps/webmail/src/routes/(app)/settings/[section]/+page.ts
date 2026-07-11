import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Static sibling routes (security, shortcuts, legacy redirect stubs) take
// precedence over this catch-all, so only the plain panel sections land here.
const SECTION_TITLES: Record<string, string> = {
	account: 'Account',
	appearance: 'Appearance',
	calendar: 'Calendar',
	compose: 'Compose',
	data: 'Data',
	reading: 'Reading'
};

export const load: PageLoad = ({ params }) => {
	const title = SECTION_TITLES[params.section];
	if (!title) throw error(404, 'Not found');
	return { section: params.section, title };
};
