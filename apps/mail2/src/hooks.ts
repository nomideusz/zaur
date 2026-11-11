import type { Reroute } from '@sveltejs/kit/hooks';
import { movedPath } from '#lib/paths';

// The pre-mail.zaur.app paths (#lib/paths): `event.url` keeps the old one, so
// register's signed handoff still verifies against the path it signed.
export const reroute: Reroute = ({ url }) => movedPath(url.pathname);
