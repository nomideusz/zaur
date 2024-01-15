import { supabase } from '$lib/supabaseClient';
import { error, json } from '@sveltejs/kit';
import { parseHTML } from 'linkedom';
/** @type {import('./$types').RequestHandler} */
export async function GET() {
	const html = await getAds();
	return json(parseAds(html));
}

async function saveToSupabase(ads) {
	try {
		for (const ad of ads) {
			const { data, error } = await supabase
				.from('ads') // zastąp 'your_table_name' nazwą twojej tabeli
				.insert([{ title: ad }]); // dostosuj strukturę obiektu do schematu tabeli

			if (error) throw error;
		}

		console.log('Data saved to Supabase!');
	} catch (err) {
		console.error(err);
	}
}

async function getAds() {
	const api = 'https://www.olx.pl/nieruchomosci/mieszkania/';
	const response = await fetch(api);

	return await response.text();
}

function parseAds(html: string) {
	const { document } = parseHTML(html);
	const titles = document.querySelectorAll('h6');

	const ads = [];
	for (const title of titles) {
		const data = title.innerText;
		ads.push(data);
	}
	saveToSupabase(ads);
	return ads;
}
