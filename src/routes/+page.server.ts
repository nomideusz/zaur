import { supabase } from '$lib/supabaseClient';

export async function load() {
	const { data, error } = await supabase.from('ads').insert({ id: 1, title: 'Denmark' }).select();

	console.log(data);
	// const { data } = await supabase.from('countries').select();
	return {
		countries: data ?? []
	};
}
