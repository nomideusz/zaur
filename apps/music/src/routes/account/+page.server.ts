import { signedIn } from '#lib/server/auth';
import { accountUrl } from '#lib/server/oidc';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => ({ user: signedIn(event), manage: accountUrl() });
