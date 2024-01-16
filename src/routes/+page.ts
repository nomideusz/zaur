import { supabase } from '$lib/supabaseClient';
import { ads } from '$lib/adsStore';

export async function load() {
	const { data, error } = await supabase
		.from('ads')
		.select()
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Błąd podczas pobierania danych z bazy:', error);
		return;
	}

	ads.set(data ?? []);
}
