// svelte-geometrize's browser-safe fitter, off the main thread: hill-climbing a
// visitor's photo takes seconds, and the page keeps scrolling meanwhile.
import { fitShapes } from '@nomideusz/svelte-geometrize/fit';
import type { GeometrizePreset } from '@nomideusz/svelte-geometrize';

export type FitRequest = {
	id: number;
	rgba: Uint8ClampedArray;
	width: number;
	height: number;
	sourceWidth: number;
	sourceHeight: number;
	preset: GeometrizePreset;
	shapes: number;
};

self.onmessage = ({ data }: MessageEvent<FitRequest>) => {
	const { id, rgba, width, height, sourceWidth, sourceHeight, preset, shapes } = data;
	const began = performance.now();
	try {
		const placeholder = fitShapes(rgba, width, height, sourceWidth, sourceHeight, { preset, shapes });
		self.postMessage({ id, placeholder, ms: performance.now() - began });
	} catch (e) {
		self.postMessage({ id, error: String(e) });
	}
};
