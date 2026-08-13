export type SecurityPolicyFailure = 'content_type' | 'origin';

const LOCKED_PERMISSIONS = 'camera=(), microphone=(), geolocation=()';
const MEET_PERMISSIONS =
	'camera=(self), microphone=(self), display-capture=(self), geolocation=()';

/** Camera/mic stay locked site-wide; LiveKit join pages need them. */
export function permissionsPolicyForPath(pathname: string): string {
	return pathname === '/meet' || pathname.startsWith('/meet/')
		? MEET_PERMISSIONS
		: LOCKED_PERMISSIONS;
}

export function validateSameOriginJson(
	request: Pick<Request, 'headers'>,
	expectedOrigin: string
): SecurityPolicyFailure | null {
	const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
	if (!contentType.startsWith('application/json')) return 'content_type';
	const origin = request.headers.get('origin');
	if (
		!origin ||
		origin !== expectedOrigin ||
		request.headers.get('sec-fetch-site') === 'cross-site'
	) {
		return 'origin';
	}
	return null;
}
