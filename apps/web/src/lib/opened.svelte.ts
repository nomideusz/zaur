// What stands open at phone width, where the Packages section keeps its secondary
// panels shut. CSS alone shuts them, and only under 900px, so a wider screen never
// reads this and the prerendered page never jumps.
export const opened = $state<Record<string, boolean>>({});

/** A link to a package (Try it, a search result, a shared address) opens its panel and its index row. */
function open(hash: string | null | undefined) {
	const id = hash && /^#pkg-(.+)$/.exec(hash)?.[1];
	if (!id) return;
	opened[id] = true;
	opened[`row-${id}`] = true;
}

export function watchOpened() {
	const onhash = () => open(location.hash);
	// A link to the hash already in the address fires no hashchange.
	const onclick = (e: MouseEvent) => open((e.target as Element).closest?.('a[href^="#pkg-"]')?.getAttribute('href'));
	onhash();
	addEventListener('hashchange', onhash);
	addEventListener('click', onclick);
	return () => {
		removeEventListener('hashchange', onhash);
		removeEventListener('click', onclick);
	};
}
