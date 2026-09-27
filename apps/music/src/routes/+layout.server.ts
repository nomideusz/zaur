import { signedIn } from '#lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => ({ user: signedIn(event) });
