import { createReroute } from '@nomideusz/svelte-i18n';
import { routing } from '#lib/i18n-routing';

// /pl, /de and /ua are served by the same route as /; no duplicate route files.
export const reroute = createReroute(routing);
