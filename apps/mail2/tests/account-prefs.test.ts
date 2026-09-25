import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	ACCOUNT_PREF_KEYS,
	DEFAULT_PREFS,
	accountPrefsOf,
	mergeAccountPrefs,
	parsePrefs,
	type Prefs
} from '../src/lib/settings.ts';

test('ACCOUNT_PREF_KEYS: the device-shaped preferences never travel', () => {
	// Syncing these would be a regression, not a feature: a 760px list pushed
	// from a wide monitor eats the reader on a laptop, and the sidebar is an
	// overlay drawer on a phone but a column on a desktop.
	assert.equal(ACCOUNT_PREF_KEYS.includes('listWidth' as never), false);
	assert.equal(ACCOUNT_PREF_KEYS.includes('sidebarOpen' as never), false);
	assert.deepEqual([...ACCOUNT_PREF_KEYS].sort(), [
		'aiCategories',
		'composePlain',
		'markReadOnOpen',
		'pageSize',
		'showAvatars',
		'showPreview',
		'showRemoteImages',
		'undoSendSeconds',
		'unseenByDefault'
	]);
});

test('accountPrefsOf: carries only the account keys, whatever else is set', () => {
	const local: Prefs = { ...DEFAULT_PREFS, listWidth: 720, sidebarOpen: false, pageSize: 100 };
	assert.deepEqual(accountPrefsOf(local), {
		pageSize: 100,
		markReadOnOpen: DEFAULT_PREFS.markReadOnOpen,
		showPreview: DEFAULT_PREFS.showPreview,
		showAvatars: DEFAULT_PREFS.showAvatars,
		unseenByDefault: DEFAULT_PREFS.unseenByDefault,
		showRemoteImages: false,
		composePlain: DEFAULT_PREFS.composePlain,
		aiCategories: DEFAULT_PREFS.aiCategories,
		undoSendSeconds: DEFAULT_PREFS.undoSendSeconds
	});
});

test('showAvatars: off unless the person says otherwise, and it travels', () => {
	assert.equal(DEFAULT_PREFS.showAvatars, false);
	const merged = mergeAccountPrefs({ ...DEFAULT_PREFS }, { showAvatars: true });
	assert.equal(merged.showAvatars, true);
});

test('mergeAccountPrefs: the account fills in, the device keeps its own shape', () => {
	const local: Prefs = { ...DEFAULT_PREFS, listWidth: 720, sidebarOpen: false };
	const merged = mergeAccountPrefs(local, { pageSize: 200, unseenByDefault: true });
	assert.equal(merged.pageSize, 200);
	assert.equal(merged.unseenByDefault, true);
	// The device-shaped ones are untouched by anything the account says.
	assert.equal(merged.listWidth, 720);
	assert.equal(merged.sidebarOpen, false);
});

test('mergeAccountPrefs: nothing stored on the account changes nothing', () => {
	const local: Prefs = { ...DEFAULT_PREFS, pageSize: 25 };
	assert.deepEqual(mergeAccountPrefs(local, null), local);
	assert.deepEqual(mergeAccountPrefs(local, {}), local);
});

test('mergeAccountPrefs: a corrupt account copy cannot corrupt the device', () => {
	const local: Prefs = { ...DEFAULT_PREFS };
	const merged = mergeAccountPrefs(local, {
		// Wrong types, and a page size that is not on the menu.
		markReadOnOpen: 'yes',
		showPreview: 1,
		pageSize: 9999
	} as never);
	assert.equal(merged.markReadOnOpen, DEFAULT_PREFS.markReadOnOpen);
	assert.equal(merged.showPreview, DEFAULT_PREFS.showPreview);
	assert.equal(merged.pageSize, DEFAULT_PREFS.pageSize);
});

test('mergeAccountPrefs: a device-shaped key smuggled in is ignored', () => {
	const local: Prefs = { ...DEFAULT_PREFS, listWidth: 400 };
	const merged = mergeAccountPrefs(local, { listWidth: 760, sidebarOpen: false } as never);
	assert.equal(merged.listWidth, 400);
	assert.equal(merged.sidebarOpen, DEFAULT_PREFS.sidebarOpen);
});

test('undoSendSeconds: only the windows on offer, from the account or the device', () => {
	assert.equal(mergeAccountPrefs({ ...DEFAULT_PREFS }, { undoSendSeconds: 20 }).undoSendSeconds, 20);
	assert.equal(mergeAccountPrefs({ ...DEFAULT_PREFS }, { undoSendSeconds: 7 }).undoSendSeconds, DEFAULT_PREFS.undoSendSeconds);
	assert.equal(parsePrefs('{"undoSendSeconds":3600}').undoSendSeconds, DEFAULT_PREFS.undoSendSeconds);
	assert.equal(parsePrefs('{"undoSendSeconds":0}').undoSendSeconds, 0);
});
