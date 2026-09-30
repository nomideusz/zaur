import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Adding moved into Search. Installed apps still share to /add until their manifest updates.
export const load: PageServerLoad = ({ url }) => redirect(308, `/search${url.search}`);
