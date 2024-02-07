import { ads } from "$lib/adsStore";
import { adsCount } from "$lib/adsCountStore";
import { supabase } from "$lib/supabase";

export async function subscribeToAds() {
	const { data: adsSell } = await supabase
		.from("ads_sell")
		.select("*", { count: "exact" });
	const { data: adsRent } = await supabase
		.from("ads_rent")
		.select("*", { count: "exact" });
	adsCount.set(adsSell.length + adsRent.length);

	supabase
		.channel("")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "ads_sell" },
			(payload) => {
				ads.update((currentAds) => {
					const newAd = { ...payload.new, section: "sales" };
					const updatedAds = [newAd, ...currentAds];
					adsCount.update((adsCount) => adsCount + 1);
					return updatedAds;
				});
			}
		)
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "ads_rent" },
			(payload) => {
				ads.update((currentAds) => {
					const newAd = { ...payload.new, section: "rental" };
					const updatedAds = [newAd, ...currentAds];
					adsCount.update((adsCount) => adsCount + 1);
					return updatedAds;
				});
			}
		)
		.subscribe();
}
