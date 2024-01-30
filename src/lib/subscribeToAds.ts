import { ads } from '$lib/adsStore'; // Zaimportuj sklep
import { supabase } from '$lib/supabase';

export function subscribeToAds() {
    supabase.channel('')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: ('ads_sell') },
        (payload) => {
          ads.update((currentAds) => {
              console.log('Change received!', payload)
              const newAd = {...payload.new, section: 'sales'};
              return [newAd, ...currentAds];
          });
      }
    )
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: ('ads_rent') },
          (payload) => {
            ads.update((currentAds) => {
                console.log('Change received!', payload)
                const newAd = {...payload.new, section: 'rental'};
                return [newAd, ...currentAds];
            });
        }
      )
    .subscribe()
}
