import type { HandleServerError } from '@sveltejs/kit/hooks';
import { reportError } from '#lib/server/report';

// Kit's default logging, plus Traceway for the errors that are bugs. `error(401)`
// and friends, 404s and bad remote-function arguments are not failures.
export const handleError: HandleServerError = ({ kind, error, issues, event }) => {
	if (kind === 'validation') console.error('Remote function schema validation failed:', issues);
	if (kind !== 'unknown') return;
	console.error(error);
	reportError(error, { method: event.request.method, url: event.url.pathname });
};
