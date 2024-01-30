import { SUPABASE_URL, SUPABASE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

import { error, json } from "@sveltejs/kit";
import type { RouteParams } from './$types';
import { parseHTML } from "linkedom";
/** @type {import('./$types').RequestHandler} */
export async function GET({params}) {
    // Pobierz i przetwórz ogłoszenia prywatne
    const privateHtml = await getPrivateAds(params);
    const privateAds = parseAds(privateHtml, true, params.category, params.type);

    // Pobierz i przetwórz ogłoszenia biznesowe
    const businessHtml = await getBusinessAds(params);
    const businessAds = parseAds(businessHtml, false, params.category, params.type);

    // Ustal nazwę tabeli na podstawie kategorii
    const tableName = params.category === 'sprzedaz' ? 'ads_sell' : 'ads_rent';

    // Dodaj ogłoszenia do odpowiedniej tabeli
    await insertAds(privateAds, tableName);
    await insertAds(businessAds, tableName);

    // Połącz wyniki i zwróć jako JSON
    const allAds = [...privateAds, ...businessAds];
    return json(allAds);
}

async function insertAds(ads, tableName) {
    for (const ad of ads) {
        const { data, error } = await supabase.from(tableName).upsert(ad);

        if (error) {
            console.error(
                "Błąd podczas wstawiania lub aktualizowania danych w bazie:",
                error
            );
        }
    }
}

async function getPrivateAds({type, category}: RouteParams) {
    const api =
        `https://www.olx.pl/nieruchomosci/${type}/${category}/krakow/?page=1&search%5Border%5D=created_at%3Adesc&search%5Bprivate_business%5D=private&view=list`;
	const response = await fetch(api);
	if (!response.ok) {
		throw new Error("Failed to fetch: ${response.status}");
	}
	return await response.text();
}

async function getBusinessAds({type, category}: RouteParams) {
    const api =
        `https://www.olx.pl/nieruchomosci/${type}/${category}/krakow/?page=1&search%5Border%5D=created_at%3Adesc&search%5Bprivate_business%5D=business&view=list`;
	const response = await fetch(api);
	if (!response.ok) {
		throw new Error("Failed to fetch: ${response.status}");
	}
	return await response.text();
}

function parseAds(html: string, isPrivate: boolean, category: string, propertyType: string) {
	const { document } = parseHTML(html);
	const adsElements = document.querySelectorAll('div[data-testid="l-card"]');

	const ads = [];
	for (const adElement of adsElements) {
		const adLinkElement = adElement.querySelector("a[href]");
		let adLink = adLinkElement ? adLinkElement.getAttribute("href") : null;
		if (adLink && !adLink.startsWith("http")) {
			adLink = `https://www.olx.pl${adLink}`;
		}
		const imageElement = adElement.querySelector(".css-gl6djm img");
        const imageUrl = imageElement ? imageElement.getAttribute("src") : null;
		const row = adElement.querySelector("div.css-1venxj6");
		const title = row.querySelector("h6")?.innerText;
		const priceText = row
			.querySelector("p.css-10b0gli")
			?.innerText.replace("zł", "")
			.replace(/\s/g, "");
		const price = parseInt(priceText, 10);

		const locationDateText = row.querySelector("p.css-1a4brun")?.innerText;
		const cityDistrict = locationDateText.split(" - ")[0].split(", ");
		const city = cityDistrict[0];
		const district = cityDistrict.length > 1 ? cityDistrict[1] : null;
		const dateText = locationDateText.split(" - ")[1];
		const date = parsePolishDate(dateText);
		const sqmPriceText = row
			.querySelector("span.css-643j0o")
			?.innerText.split(" - ");
		const sqmText = sqmPriceText?.[0].replace("m²", "").replace(",", ".");
		const sqm = parseFloat(sqmText);
		let pricePerSqm = null;
        if (category === 'sprzedaz') {
            const pricePerSqmText = sqmPriceText?.[1]
                .replace("zł/m²", "")
                .replace(/\s/g, "");
            pricePerSqm = parseInt(pricePerSqmText, 10);
        }

        const ad = {
            title,
            price,
            city,
            district,
            date,
            sqm,
            price_per_sqm: pricePerSqm, // Ustawione na null dla 'wynajem'
			ad_link: adLink,
			is_private: isPrivate,
			image_url: imageUrl,
			property_type: propertyType
        };
        ads.push(ad);
    }

	return ads;
}
function parsePolishDate(dateString) {
	const monthNames = {
		stycznia: "01",
		lutego: "02",
		marca: "03",
		kwietnia: "04",
		maja: "05",
		czerwca: "06",
		lipca: "07",
		sierpnia: "08",
		września: "09",
		października: "10",
		listopada: "11",
		grudnia: "12",
	};

	// Sprawdzenie, czy data zawiera słowo "Dzisiaj"
	if (dateString.includes("Dzisiaj")) {
		const now = new Date();
		const today = `${now.getFullYear()}-${(now.getMonth() + 1)
			.toString()
			.padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
		const timePart = dateString.split(" o ")[1]; // Pobierz godzinę
		return new Date(`${today}T${timePart}:00`); // Zakładamy, że nie ma sekund
	} else {
		const parts = dateString.split(" ");
		if (parts.length === 3) {
			const day = parts[0].padStart(2, "0");
			const month = monthNames[parts[1]];
			const year = parts[2];
			return new Date(`${year}-${month}-${day}`);
		} else {
			return null;
		}
	}
}