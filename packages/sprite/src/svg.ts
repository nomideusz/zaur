import { SPRITE_FRAMES, SPRITE_GRID_H, SPRITE_GRID_W, type FrameId } from './frames.js';

export interface FrameSvgOptions {
  color?: string;
  scale?: number;
  facing?: 'left' | 'right';
}

/** Render a sprite frame as an inline SVG string. */
export function frameSvg(
  id: FrameId,
  { color = '#e8e4d8', scale = 1, facing = 'right' }: FrameSvgOptions = {}
): string {
  const rows = SPRITE_FRAMES[id];
  const w = SPRITE_GRID_W * scale;
  const h = SPRITE_GRID_H * scale;
  const rects: string[] = [];

  for (let y = 0; y < SPRITE_GRID_H; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < SPRITE_GRID_W; x++) {
      if ((row[x] ?? '.') !== 'X') continue;
      const px = facing === 'right' ? x : SPRITE_GRID_W - 1 - x;
      rects.push(
        `<rect x="${px * scale}" y="${y * scale}" width="${scale}" height="${scale}"/>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" fill="${color}">${rects.join('')}</svg>`;
}

export function frameSvgDataUri(id: FrameId, options?: FrameSvgOptions): string {
  return `data:image/svg+xml,${encodeURIComponent(frameSvg(id, options))}`;
}
