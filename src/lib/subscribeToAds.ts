import { ads } from "$lib/adsStore";
import { adsCount } from "$lib/adsCountStore";
import { supabase } from "$lib/supabase";
import { toast } from "svelte-sonner";

let firstLoadComplete = false;
let toastDisplayed = false;

function showToast(message) {
    if (!toastDisplayed) {
        toast.info(message);
        toastDisplayed = true;
        setTimeout(() => {
            toastDisplayed = false;
        }, 10000);
    }
}

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
                if (firstLoadComplete) {
                    showToast('Zaur zzaurował nowe ogłoszenia sprzedaży.');
                } else {
                    firstLoadComplete = true;
                }
                ads.update((currentAds) => {
                    const newAd = { ...payload.new, section: "sales" };
                    const updatedAds = [newAd, ...currentAds];
                    adsCount.update((count) => count + 1);
                    return updatedAds;
                });
            }
        )
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "ads_rent" },
            (payload) => {
                if (firstLoadComplete) {
                    showToast('Zaur zzaurował nowe ogłoszenia wynajmu.');
                } else {
                    firstLoadComplete = true;
                }
                ads.update((currentAds) => {
                    const newAd = { ...payload.new, section: "rental" };
                    const updatedAds = [newAd, ...currentAds];
                    adsCount.update((count) => count + 1);
                    return updatedAds;
                });
            }
        )
        .subscribe();
}
