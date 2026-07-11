import type { PageServerLoad } from './$types';
import { isPasswordResetEnabled } from '$lib/server/register-api';

// Resolve the sign-in config during SSR so the form is in the initial HTML. Mobile users
// arriving from registration must never wait on client-side JS just to see the inputs.
export const load: PageServerLoad = async ({ url }) => {
	// isAdd comes from the navigated URL here (not the client $page store), so the
	// "already authenticated → go to mail" redirect can be suppressed reliably even
	// during a view-transition navigation.
	return {
		isAdd: url.searchParams.get('mode') === 'add',
		passwordResetEnabled: isPasswordResetEnabled()
	};
};
