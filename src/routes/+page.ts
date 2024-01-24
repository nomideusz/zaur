import { ads_sell, ads_rent } from "$lib/adsStore";

export async function load({ fetch }) {
	const data_sell = await (await fetch("api/sell")).json();
	const data_rent = await (await fetch("api/rent")).json();
	ads_sell.set(data_sell ?? []);
	ads_rent.set(data_rent ?? []);
	return { data_sell, data_rent };
}
