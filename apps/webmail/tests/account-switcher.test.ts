import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	accountInitial,
	accountRailMode,
	formatUnreadBadge,
	orderedAccountsForSwitcher,
	otherAccountsUnreadSum
} from '../src/lib/shell/account-switcher.ts';

describe('account-switcher helpers', () => {
	it('derives initials from display name or username', () => {
		assert.equal(accountInitial('Ada Lovelace', 'ada@example.com'), 'A');
		assert.equal(accountInitial('', 'bob@example.com'), 'B');
		assert.equal(accountInitial('  ', ''), '?');
	});

	it('formats unread badges', () => {
		assert.equal(formatUnreadBadge(0), '');
		assert.equal(formatUnreadBadge(3), '3');
		assert.equal(formatUnreadBadge(99), '99');
		assert.equal(formatUnreadBadge(100), '99+');
	});

	it('sums unread on inactive accounts only', () => {
		const accounts = [
			{ key: 'a', username: 'a@x', displayName: 'A', isActive: true },
			{ key: 'b', username: 'b@x', displayName: 'B', isActive: false },
			{ key: 'c', username: 'c@x', displayName: 'C', isActive: false }
		];
		assert.equal(otherAccountsUnreadSum(accounts, { a: 9, b: 2, c: 5 }, 'a'), 7);
		assert.equal(otherAccountsUnreadSum(accounts, { a: 9 }, 'a'), 0);
	});

	it('orders active account first', () => {
		const accounts = [
			{ key: 'b', username: 'b@x', displayName: 'B', isActive: false },
			{ key: 'a', username: 'a@x', displayName: 'A', isActive: true },
			{ key: 'c', username: 'c@x', displayName: 'C', isActive: false }
		];
		assert.deepEqual(
			orderedAccountsForSwitcher(accounts).map((account) => account.key),
			['a', 'b', 'c']
		);
	});

	it('picks rail mode from account count', () => {
		assert.equal(accountRailMode(0), 'hidden');
		assert.equal(accountRailMode(1), 'hidden');
		assert.equal(accountRailMode(2), 'inline');
		assert.equal(accountRailMode(3), 'inline');
		assert.equal(accountRailMode(4), 'overflow');
	});
});
