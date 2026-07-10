export type ValidJmapMethodCall = [string, Record<string, unknown>, string];

export interface ValidJmapRequest {
	using?: string[];
	methodCalls: ValidJmapMethodCall[];
}

export type JmapRequestValidation =
	| { ok: true; value: ValidJmapRequest }
	| { ok: false; error: string };

export const MAX_JMAP_METHOD_CALLS = 64;
export const MAX_JMAP_CAPABILITIES = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateJmapRequest(value: unknown): JmapRequestValidation {
	if (!isRecord(value)) {
		return { ok: false, error: 'Request body must be an object' };
	}

	const using = value.using;
	if (
		using !== undefined &&
		(!Array.isArray(using) ||
			using.length > MAX_JMAP_CAPABILITIES ||
			using.some((capability) => typeof capability !== 'string' || !capability || capability.length > 200))
	) {
		return { ok: false, error: 'Invalid using capabilities' };
	}
	if ((using as unknown[] | undefined)?.includes('urn:stalwart:jmap')) {
		return { ok: false, error: 'Management capabilities are not available through this endpoint' };
	}

	const methodCalls = value.methodCalls;
	if (!Array.isArray(methodCalls) || methodCalls.length === 0) {
		return { ok: false, error: 'methodCalls required' };
	}
	if (methodCalls.length > MAX_JMAP_METHOD_CALLS) {
		return { ok: false, error: `Too many method calls (maximum ${MAX_JMAP_METHOD_CALLS})` };
	}

	const validCalls: ValidJmapMethodCall[] = [];
	for (const call of methodCalls) {
		if (
			!Array.isArray(call) ||
			call.length !== 3 ||
			typeof call[0] !== 'string' ||
			call[0].length === 0 ||
			call[0].length > 128 ||
			!isRecord(call[1]) ||
			typeof call[2] !== 'string' ||
			call[2].length === 0 ||
			call[2].length > 128
		) {
			return { ok: false, error: 'Invalid method call' };
		}
		if (call[0].startsWith('x:')) {
			return { ok: false, error: 'Management methods are not available through this endpoint' };
		}
		validCalls.push(call as ValidJmapMethodCall);
	}

	return {
		ok: true,
		value: {
			using: using as string[] | undefined,
			methodCalls: validCalls
		}
	};
}
