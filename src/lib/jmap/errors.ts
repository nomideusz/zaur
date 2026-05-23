export type LoginErrorCode = 'invalid_credentials' | 'cors_blocked' | 'connection_failed' | 'generic';

const ERROR_PATTERNS: Array<{ code: LoginErrorCode; matches: string[] }> = [
	{ code: 'cors_blocked', matches: ['CORS_ERROR'] },
	{ code: 'invalid_credentials', matches: ['Invalid username or password', '401', 'Unauthorized'] },
	{
		code: 'connection_failed',
		matches: ['Failed to fetch', 'NetworkError', 'Network request failed', 'ECONNREFUSED']
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

export function loginErrorMessage(code: LoginErrorCode): string {
	switch (code) {
		case 'invalid_credentials':
			return 'Invalid email or password. If 2FA is enabled, append your code as password$123456.';
		case 'cors_blocked':
			return 'Cannot reach the mail server from the browser (CORS). Enable permissive CORS on Stalwart or use a proxy.';
		case 'connection_failed':
			return 'Could not connect to the mail server. Check the URL and your network.';
		default:
			return 'Sign-in failed. Please try again.';
	}
}
