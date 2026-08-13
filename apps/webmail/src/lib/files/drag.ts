export const FILE_NODE_DRAG_TYPE = 'text/zaur-filenode';

export function setFileNodeDragData(dataTransfer: DataTransfer, nodeId: string): void {
	dataTransfer.setData(FILE_NODE_DRAG_TYPE, nodeId);
	dataTransfer.effectAllowed = 'move';
}

export function fileNodeDragId(dataTransfer: DataTransfer | null): string | null {
	if (!dataTransfer) return null;
	return dataTransfer.getData(FILE_NODE_DRAG_TYPE) || null;
}

export function hasFileNodeDrag(dataTransfer: DataTransfer | null): boolean {
	if (!dataTransfer) return false;
	return [...dataTransfer.types].includes(FILE_NODE_DRAG_TYPE);
}
