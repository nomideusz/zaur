import { ads } from '$lib/adsStore'; // Zaimportuj sklep
import { supabase } from '$lib/supabaseClient';

export function subscribeToAds() {
	supabase
		.channel('custom-insert-channel')
		.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ads' }, (payload) => {
			ads.update((currentAds) => {
				// Dodaj nowe ogłoszenie na początek listy
				return [payload.new, ...currentAds];
			});
		})
		.subscribe();
}
