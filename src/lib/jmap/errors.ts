export type LoginErrorCode =
	| 'invalid_credentials'
	| 'cors_blocked'
	| 'connection_failed'
	| 'server_unavailable'
	| 'generic';

const ERROR_PATTERNS: Array<{ code: LoginErrorCode; matches: string[] }> = [
	{ code: 'cors_blocked', matches: ['CORS_ERROR'] },
	{ code: 'invalid_credentials', matches: ['Invalid username or password', '401', 'Unauthorized'] },
	{
		code: 'server_unavailable',
		matches: [
			'Failed to get session: 502',
			'Failed to get session: 503',
			'Failed to get session: 504',
			'502',
			'503',
			'504',
			'Bad Gateway',
			'Service Unavailable',
			'Gateway Timeout'
		]
	},
	{
		code: 'connection_failed',
		matches: ['Failed to fetch', 'NetworkError', 'Network request failed', 'ECONNREFUSED', 'ENOTFOUND']
	}
];

export function classifyJmapError(error: unknown): LoginErrorCode {
	if (!(error instanceof Error)) return 'generic';
	const message = error.message;
	for (const { code, matches } of ERROR_PATTERNS) {
		if (matches.some((pattern) => message.includes(pattern))) return code;
	}
	return 'generic';
}

export function loginErrorMessage(code: LoginErrorCode, serverUrl?: string): string {
	const host = serverUrl?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? 'mail server';

	switch (code) {
		case 'invalid_credentials':
			return 'Invalid email or password. If 2FA is enabled, append your code as password$123456.';
		case 'cors_blocked':
			return 'Cannot reach the mail server. Check server connectivity and configuration.';
		case 'connection_failed':
			return 'Could not connect to the mail server. Check the URL and your network.';
		case 'server_unavailable':
			return `The mail server (${host}) is temporarily unavailable. Try again in a few minutes.`;
		default:
			return 'Sign-in failed. Please try again.';
	}
}
