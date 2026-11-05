/**
 * A line of counts as SVG paths, in a box 1000 wide and 100 tall that the page
 * stretches. Between sites, height is the square root of the count on one shared
 * peak, so a quiet site still shows its shape next to a busy one. A single site's
 * own lines are linear. A plot's caption gives its scale.
 */
export const BOX_W = 1000;
export const BOX_H = 100;

export const heightOf = (n: number, peak: number, linear = false) => {
	if (peak <= 0) return 0;
	const share = Math.max(0, n) / peak;
	return linear ? share : Math.sqrt(share);
};

/**
 * `line` runs through the whole readings; `tail` is the reading still counting,
 * which a line short of its last slot always has, and a rolling one says it has.
 */
export function linePaths(values: number[], slots: number, peak: number, linear = false, rolling = false): { line: string; tail: string; area: string } {
	if (!values.length) return { line: '', tail: '', area: '' };
	const x = (i: number) => (slots > 1 ? (i / (slots - 1)) * BOX_W : BOX_W);
	const y = (n: number) => BOX_H - 1 - heightOf(n, peak, linear) * (BOX_H - 3);
	const point = (n: number, i: number) => `${x(i).toFixed(1)} ${y(n).toFixed(1)}`;
	const points = values.map(point);
	const lead = slots > 1 && values.length === 1 ? [`0 ${BOX_H - 1}`] : [];
	const all = [...lead, ...points];
	const last = x(values.length - 1).toFixed(1);
	const area = `M${all.join('L')}L${last} ${BOX_H}L0 ${BOX_H}Z`;
	const open = rolling || values.length < slots;
	if (!open || all.length < 2) return { line: `M${all.join('L')}`, tail: '', area };
	const whole = all.slice(0, -1);
	return { line: `M${whole.join('L')}`, tail: `M${whole.at(-1)}L${all.at(-1)}V${BOX_H}`, area };
}

/**
 * The same counts as one line that steps once a slot, flat across each, so one day
 * reads against another. The last reading is still counting, so it is the tail.
 * `stems` are the upright rules between neighbours, as high as the lower of the two.
 */
export function stepPaths(values: number[], slots: number, peak: number, linear = false): { line: string; tail: string; area: string; stems: string } {
	if (!values.length) return { line: '', tail: '', area: '', stems: '' };
	const base = BOX_H - 1;
	const x = (i: number) => ((i / slots) * BOX_W).toFixed(1);
	const y = (n: number) => (base - heightOf(n, peak, linear) * (BOX_H - 3)).toFixed(1);
	const last = values.length - 1;
	const whole = values.slice(0, last).map((n, i) => `V${y(n)}H${x(i + 1)}`).join('');
	const line = last ? `M0 ${y(values[0])}${whole}` : '';
	const tail = `M${x(last)} ${last ? y(values[last - 1]) : base}V${y(values[last])}H${x(last + 1)}V${base}`;
	const area = `M0 ${BOX_H}V${base}${values.map((n, i) => `V${y(n)}H${x(i + 1)}`).join('')}V${BOX_H}Z`;
	const stems = [`M0 ${base}V${y(values[0])}`, ...values.slice(1).map((n, i) => `M${x(i + 1)} ${base}V${y(Math.min(n, values[i]))}`)].join('');
	return { line, tail, area, stems };
}

/** The box a slot's reading stands in, for the one column a pointer holds. */
export function columnBox(i: number, n: number, slots: number, peak: number, linear = false) {
	const top = BOX_H - 1 - heightOf(n, peak, linear) * (BOX_H - 3);
	return { x: (i / slots) * BOX_W, y: top, width: BOX_W / slots, height: BOX_H - 1 - top };
}

/** The same line in real pixels, for a stroke that must keep its length as it travels. */
export function pixelPath(values: number[], width: number, height: number, peak: number): string {
	if (values.length < 2 || !width || !height) return '';
	return 'M' + values.map((n, i) => `${((i / (values.length - 1)) * width).toFixed(1)} ${(height - 1 - heightOf(n, peak, true) * (height - 3)).toFixed(1)}`).join('L');
}
