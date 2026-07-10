import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	MAX_JMAP_METHOD_CALLS,
	validateJmapRequest
} from '../src/lib/server/jmap-request.ts';

describe('validateJmapRequest', () => {
	it('accepts a valid JMAP request', () => {
		const result = validateJmapRequest({
			using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
			methodCalls: [['Email/query', { accountId: 'account' }, 'query-1']]
		});

		assert.equal(result.ok, true);
		if (result.ok) {
			assert.equal(result.value.methodCalls[0][0], 'Email/query');
			assert.equal(result.value.using?.length, 2);
		}
	});

	it('rejects missing and malformed method calls', () => {
		assert.deepEqual(validateJmapRequest({}), {
			ok: false,
			error: 'methodCalls required'
		});
		assert.deepEqual(validateJmapRequest({ methodCalls: [['Email/query', [], 'query-1']] }), {
			ok: false,
			error: 'Invalid method call'
		});
	});

	it('keeps Stalwart management methods out of the browser proxy', () => {
		assert.equal(
			validateJmapRequest({
				using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'],
				methodCalls: [['x:AccountPassword/get', { ids: ['singleton'] }, 'c1']]
			}).ok,
			false
		);
		assert.equal(
			validateJmapRequest({
				methodCalls: [['x:ApiKey/query', { filter: {} }, 'c1']]
			}).ok,
			false
		);
	});

	it('caps the number of calls in a request', () => {
		const methodCalls = Array.from({ length: MAX_JMAP_METHOD_CALLS + 1 }, (_, index) => [
			'Email/get',
			{},
			`get-${index}`
		]);
		assert.deepEqual(validateJmapRequest({ methodCalls }), {
			ok: false,
			error: `Too many method calls (maximum ${MAX_JMAP_METHOD_CALLS})`
		});
	});

	it('validates capability identifiers', () => {
		assert.deepEqual(
			validateJmapRequest({
				using: [''],
				methodCalls: [['Core/echo', {}, 'echo-1']]
			}),
			{ ok: false, error: 'Invalid using capabilities' }
		);
	});
});
