import { goto as kitGoto } from '$app/navigation';

export function isNavigationAborted(error: unknown): boolean {
	return error instanceof Error && error.message.toLowerCase().includes('navigation aborted');
}

type KitGoto = typeof kitGoto;

/** Goto that swallows superseded-navigation errors (e.g. rapid settings tab clicks). */
export function goto(
	url: Parameters<KitGoto>[0],
	options?: Parameters<KitGoto>[1]
): ReturnType<KitGoto> {
	return kitGoto(url, options).catch((error) => {
		if (isNavigationAborted(error)) return;
		throw error;
	}) as ReturnType<KitGoto>;
}
