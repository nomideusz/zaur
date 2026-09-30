import { signedIn } from '#lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => ({ user: signedIn(event) });
