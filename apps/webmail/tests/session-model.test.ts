import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	accountKey,
	dropAccount,
	getAccount,
	getActiveAccount,
	isSession,
	mergeLinkedGroup,
	removeFromGroup,
	upsertAccount,
	withAccountTokens,
	withActiveAccount,
	wrapAccount,
	type Session,
	type SessionData
} from '../src/lib/server/session-model.ts';

function acct(username: string, token: string): SessionData {
	return { serverUrl: 'https://mail.zaur.app', username, accessToken: token, refreshToken: `r-${token}` };
}

describe('session-model', () => {
	it('accountKey normalizes email casing/whitespace', () => {
		assert.equal(accountKey('  Bartek@Zaur.App '), 'bartek@zaur.app');
	});

	it('isSession distinguishes a multi-account session from a legacy SessionData', () => {
		assert.ok(isSession({ id: 's', accounts: [], activeKey: '' }));
		assert.equal(isSession(acct('a@x.io', 't')), false);
		assert.equal(isSession(null), false);
	});

	it('wrapAccount builds a one-account session and strips the id off the account', () => {
		const s = wrapAccount({ ...acct('a@x.io', 't'), id: 'leak' }, 'sid', true);
		assert.equal(s.id, 'sid');
		assert.equal(s.activeKey, 'a@x.io');
		assert.equal(s.accounts.length, 1);
		assert.equal(s.accounts[0].id, undefined); // session id never stored per-account
		assert.equal(s.remember, true);
	});

	it('getActiveAccount returns the active one, falling back to the first', () => {
		const s: Session = { id: 'sid', accounts: [acct('a@x.io', 't1'), acct('b@y.io', 't2')], activeKey: 'b@y.io' };
		assert.equal(getActiveAccount(s)?.username, 'b@y.io');
		assert.equal(getActiveAccount({ ...s, activeKey: 'gone@z.io' })?.username, 'a@x.io');
	});

	it('upsertAccount adds across domains and makes it active', () => {
		let s = wrapAccount(acct('a@x.io', 't1'), 'sid');
		s = upsertAccount(s, acct('b@other-domain.org', 't2'));
		assert.deepEqual(s.accounts.map((a) => a.username), ['a@x.io', 'b@other-domain.org']);
		assert.equal(s.activeKey, 'b@other-domain.org');
	});

	it('upsertAccount dedupes by email (case-insensitive), replacing tokens', () => {
		let s = wrapAccount(acct('a@x.io', 'old'), 'sid');
		s = upsertAccount(s, acct('b@y.io', 't2'));
		s = upsertAccount(s, acct('A@X.io', 'new'));
		assert.equal(s.accounts.length, 2);
		assert.equal(getAccount(s, 'a@x.io')?.accessToken, 'new');
		assert.equal(s.activeKey, 'a@x.io');
	});

	it('withAccountTokens updates only the matching account (token isolation)', () => {
		let s: Session = { id: 'sid', accounts: [acct('a@x.io', 't1'), acct('b@y.io', 't2')], activeKey: 'a@x.io' };
		s = withAccountTokens(s, acct('a@x.io', 't1-refreshed'));
		assert.equal(getAccount(s, 'a@x.io')?.accessToken, 't1-refreshed');
		assert.equal(getAccount(s, 'b@y.io')?.accessToken, 't2'); // sibling untouched
	});

	it('dropAccount removes one and re-points active; null when last removed', () => {
		const s: Session = { id: 'sid', accounts: [acct('a@x.io', 't1'), acct('b@y.io', 't2')], activeKey: 'b@y.io' };
		const after = dropAccount(s, 'b@y.io');
		assert.equal(after?.accounts.length, 1);
		assert.equal(after?.activeKey, 'a@x.io'); // active re-pointed away from removed
		assert.equal(dropAccount(wrapAccount(acct('a@x.io', 't1'), 'sid'), 'a@x.io'), null);
	});

	it('withActiveAccount switches when known, no-ops when unknown', () => {
		const s: Session = { id: 'sid', accounts: [acct('a@x.io', 't1'), acct('b@y.io', 't2')], activeKey: 'a@x.io' };
		assert.equal(withActiveAccount(s, 'b@y.io').activeKey, 'b@y.io');
		assert.equal(withActiveAccount(s, 'nope@z.io').activeKey, 'a@x.io');
	});

	it('mergeLinkedGroup puts the fresh login first with its tokens, then the rest', () => {
		const fresh = acct('a@x.io', 'fresh'); // this login's tokens
		const group = [acct('A@X.io', 'stale'), acct('b@y.io', 't2')]; // stored copy of A is stale
		const merged = mergeLinkedGroup(fresh, group);
		assert.deepEqual(merged.map((a) => a.username), ['a@x.io', 'b@y.io']); // self deduped (case-insensitive)
		assert.equal(merged[0].accessToken, 'fresh'); // fresh tokens win over the stored copy
		assert.equal(merged[1].accessToken, 't2');
	});

	it('mergeLinkedGroup strips any leaked session id off restored accounts', () => {
		const merged = mergeLinkedGroup({ ...acct('a@x.io', 't'), id: 'leak' }, [{ ...acct('b@y.io', 't2'), id: 'leak2' }]);
		assert.equal(merged[0].id, undefined);
		assert.equal(merged[1].id, undefined);
	});

	it('mergeLinkedGroup returns just the fresh account when it has no group', () => {
		assert.deepEqual(mergeLinkedGroup(acct('a@x.io', 't'), []).map((a) => a.username), ['a@x.io']);
	});

	it('removeFromGroup drops a member case-insensitively', () => {
		const group = [acct('a@x.io', 't1'), acct('b@y.io', 't2')];
		assert.deepEqual(removeFromGroup(group, 'A@X.io').map((a) => a.username), ['b@y.io']);
		assert.equal(removeFromGroup(group, 'nope@z.io').length, 2);
	});
});
