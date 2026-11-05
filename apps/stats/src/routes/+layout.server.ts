import type { LayoutServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { readArrangement } from '#lib/server/prefs';

export const load: LayoutServerLoad = ({ locals, depends }) => {
	depends('stats:data');
	return { arrangement: readArrangement(getDb(), locals.user!.email) };
};
