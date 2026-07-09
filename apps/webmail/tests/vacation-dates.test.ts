import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { vacationDateInputValue, vacationDateToUtc } from '../src/lib/utils/vacation-dates.ts';

describe('vacation date mapping', () => {
	it('renders a UTCDate as a date-input value', () => {
		assert.equal(vacationDateInputValue('2026-07-14T00:00:00Z'), '2026-07-14');
		assert.equal(vacationDateInputValue(null), '');
		assert.equal(vacationDateInputValue(undefined), '');
	});

	it('maps date-input values to day edges', () => {
		assert.equal(vacationDateToUtc('2026-07-14', 'start'), '2026-07-14T00:00:00Z');
		assert.equal(vacationDateToUtc('2026-07-20', 'end'), '2026-07-20T23:59:59Z');
		assert.equal(vacationDateToUtc('', 'start'), null);
		assert.equal(vacationDateToUtc('', 'end'), null);
	});

	it('round-trips through the input', () => {
		const utc = vacationDateToUtc('2026-07-20', 'end');
		assert.equal(vacationDateInputValue(utc), '2026-07-20');
	});
});
