import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Mirrors settings.confirmDeleteMessage policy for reversible trash:
 * permanent → always confirm; undo window > 0 → skip; else honor confirmBeforeDelete.
 */
function shouldAskTrashConfirm(options: {
	permanent: boolean;
	undoSendDelay: number;
	confirmBeforeDelete: boolean;
}): boolean {
	if (options.permanent) return true;
	if (options.undoSendDelay > 0) return false;
	return options.confirmBeforeDelete;
}

describe('trash confirm policy', () => {
	it('always confirms permanent delete', () => {
		assert.equal(
			shouldAskTrashConfirm({
				permanent: true,
				undoSendDelay: 5000,
				confirmBeforeDelete: false
			}),
			true
		);
	});

	it('skips trash confirm when the undo window is enabled', () => {
		assert.equal(
			shouldAskTrashConfirm({
				permanent: false,
				undoSendDelay: 5000,
				confirmBeforeDelete: true
			}),
			false
		);
	});

	it('honors confirmBeforeDelete when undo is off', () => {
		assert.equal(
			shouldAskTrashConfirm({
				permanent: false,
				undoSendDelay: 0,
				confirmBeforeDelete: true
			}),
			true
		);
		assert.equal(
			shouldAskTrashConfirm({
				permanent: false,
				undoSendDelay: 0,
				confirmBeforeDelete: false
			}),
			false
		);
	});
});
