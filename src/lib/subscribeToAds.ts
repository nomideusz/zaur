import { ads_sell, ads_rent } from '$lib/adsStore'; // Zaimportuj sklep
import { supabase } from '$lib/supabase';

export function subscribeToAds() {
	supabase.channel('custom-all-channel')
	.on(
	  'postgres_changes',
	  { event: '*', schema: 'public', table: ('ads_sell') },
		(payload) => {
		  ads_sell.update((currentAds) => {
			  console.log('Change received!', payload)
			  return [payload.new, ...currentAds];
		  });
	  }
	)
	.on(
		'postgres_changes',
		{ event: '*', schema: 'public', table: ('ads_rent') },
		  (payload) => {
			ads_rent.update((currentAds) => {
				console.log('Change received!', payload)
				return [payload.new, ...currentAds];
			});
		}
	  )
	.subscribe()
}
