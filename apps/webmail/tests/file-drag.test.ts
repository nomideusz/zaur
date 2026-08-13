import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FILE_NODE_DRAG_TYPE, fileNodeDragId, hasFileNodeDrag, setFileNodeDragData } from '../src/lib/files/drag.ts';

class FakeDataTransfer {
	#data = new Map<string, string>();
	effectAllowed = '';
	get types() {
		return [...this.#data.keys()];
	}
	setData(type: string, value: string) {
		this.#data.set(type, value);
	}
	getData(type: string) {
		return this.#data.get(type) ?? '';
	}
}

describe('file node drag data', () => {
	it('round-trips a node id', () => {
		const dt = new FakeDataTransfer();
		setFileNodeDragData(dt as unknown as DataTransfer, 'n1');
		assert.equal(dt.effectAllowed, 'move');
		assert.equal(hasFileNodeDrag(dt as unknown as DataTransfer), true);
		assert.equal(fileNodeDragId(dt as unknown as DataTransfer), 'n1');
		assert.equal(FILE_NODE_DRAG_TYPE, 'text/zaur-filenode');
	});
});
