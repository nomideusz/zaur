import { defineEnvVars } from '@sveltejs/kit/env';

// Kit 3 only hands the browser the variables declared here. Server-side config
// is still read straight from process.env.
export const variables = defineEnvVars({
	PUBLIC_TRACEWAY_DSN: {
		public: true,
		schema: (value) => value?.trim() || undefined,
		description: 'Traceway DSN, {token}@{url}/api/report. Unset = error tracking off.'
	}
});
