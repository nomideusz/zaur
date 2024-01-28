import { ads } from "$lib/adsStore";
export async function load({ fetch }) {
	const data = await (await fetch("api/sell")).json();
	ads.set(data ?? []);
	return { data };
}
