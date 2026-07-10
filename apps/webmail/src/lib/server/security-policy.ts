export type SecurityPolicyFailure = 'content_type' | 'origin';

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
