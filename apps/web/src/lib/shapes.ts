// Every capture shown as a still, fitted into triangles by svelte-geometrize at
// build time: the triangles paint first and sharpen until the photo opens
// through them. Keyed by the capture's hashed URL, so a card only needs its src.
import type { GeometrizePlaceholder } from '@nomideusz/svelte-geometrize';

const urls = import.meta.glob<string>(['./windows/*.webp', './plates/*-1.webp'], { eager: true, import: 'default' });
const fits = import.meta.glob<GeometrizePlaceholder>(['./windows/*.webp', './plates/*-1.webp'], {
	eager: true,
	import: 'default',
	query: '?geometrize'
});

const byUrl = new Map(Object.entries(urls).map(([path, url]) => [url, fits[path]]));

/** The placeholder fitted for a capture, by its URL. */
export const shapesOf = (src?: string) => (src ? byUrl.get(src) : undefined);

