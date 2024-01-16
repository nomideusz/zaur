import { supabase } from '$lib/supabaseClient';

export async function load() {
	const { data, error } = await supabase
		.from('ads')
		.select()
		.order('date', { ascending: true }) // Sortowanie malejąco wg daty
		.order('id', { ascending: false }); // Następnie sortowanie malejąco wg id

	if (error) {
		console.error('Błąd podczas pobierania danych z bazy:', error);
		return { ads: [] };
	}

	return {
		ads: data ?? []
	};
}
