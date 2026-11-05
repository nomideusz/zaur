/** A beacon landed: everyone on a live page hears it at once. */
import { EventEmitter } from 'node:events';

const bus = new EventEmitter();
bus.setMaxListeners(0);

export const hitHappened = (site: string) => bus.emit('hit', site);
export function onHit(listener: (site: string) => void): () => void {
	bus.on('hit', listener);
	return () => bus.off('hit', listener);
}
