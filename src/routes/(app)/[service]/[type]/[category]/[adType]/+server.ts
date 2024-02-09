import { SUPABASE_URL, SUPABASE_KEY } from "$env/static/private";
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { error, json } from "@sveltejs/kit";
import { parseHTML } from "linkedom";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
import type { RouteParams } from "../$types";

let browser;

/** @type {import('./$types').RequestHandler} */

export async function GET({ params }) {
    const { service, type, category, adType } = params;
    const content = await fetchPageContent({service, type, category, adType});
    let ads;
    if (service === "olx") {
        ads = parseAdsOLX(content, type, adType);
    } else if (service === "nol") {
        ads = parseAdsNieruchomosciOnline(content, type, adType);
    } else {
        throw error(400, "Unsupported service");
    }
    const tableName = getTableName(category);
    await insertAds(ads, tableName);
    return json(ads);
}

function getTableName(category) {
    return category === "sprzedaz" ? "ads_sell" : "ads_rent";
}

const isProd = process.env.NODE_ENV === "production";
console.log(isProd);


async function fetchPageContent({ service, type, category, adType }: RouteParams) {
    const url = constructURL(service, type, category, adType);
	if (!browser) {
		if (isProd) {
			browser = await puppeteer.launch({
				args: chromium.args,
				defaultViewport: chromium.defaultViewport,
				executablePath: await chromium.executablePath(),
				headless: "new",
				ignoreHTTPSErrors: true,
			});
		} else {
			browser = await puppeteer.launch({
				headless: "new",
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
				executablePath:
					"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			});
		}
    }
    const page = await browser.newPage();
	await page.goto(url, { waitUntil: "networkidle2" });
	await scrollToBottom(page);
	const content = await page.content();
	await page.close();
	return content;
}

function constructURL(service, type, category, adType) {
    if (service === "olx") {
        return `https://www.olx.pl/nieruchomosci/${type}/${category}/krakow/?page=1&search%5Border%5D=created_at%3Adesc&search%5Bprivate_business%5D=${adType}&view=list`;
    } else if (service === "nol") {
        let url = `https://krakow.nieruchomosci-online.pl/szukaj.html?3,${type},${category},,Kraków`;
        if (adType === 'private') {
            url += ',,,,,,,1';
        }
        return url;
    }
    throw new Error("Unsupported service");
}

async function scrollToBottom(page, timeout = 500) {
	const distance = 500;
	const delay = timeout;

	await page.evaluate(
		async (distance, delay) => {
			await new Promise((resolve, reject) => {
				let totalHeight = 0;
				const timer = setInterval(() => {
					window.scrollBy(0, distance);
					totalHeight += distance;

					if (totalHeight >= document.body.scrollHeight) {
						clearInterval(timer);
						resolve();
					}
				}, delay);
			});
		},
		distance,
		delay
	);
}


function parseAdsOLX(html: string, propertyType: string, adType: string) {
    const is_private = adType === 'private';
    const { document } = parseHTML(html);
    const ads = [];
    const adsElements = document.querySelectorAll('div[data-testid="l-card"]');

    adsElements.forEach(adElement => {
        const titleElement = adElement.querySelector("h6");
        const title = titleElement ? titleElement.textContent : "";

        const priceElement = adElement.querySelector("p.css-10b0gli");
        const price = priceElement ? priceElement.textContent.replace(/\D/g, '') : 0;

        const linkElement = adElement.querySelector("a[href]");
        const link = linkElement ? linkElement.getAttribute("href") : "";

        const imageUrlElement = adElement.querySelector("img");
        const imageUrl = imageUrlElement ? imageUrlElement.getAttribute("src") : "";

        const locationDateText = adElement.querySelector("p.css-1a4brun")?.innerText;
        const cityDistrict = locationDateText.split(" - ")[0].split(", ");
        const city = cityDistrict[0];
        const district = cityDistrict.length > 1 ? cityDistrict[1] : null;
        const dateText = locationDateText.split(" - ")[1];
        const date = parsePolishDate(dateText);

        const sqmPriceText = adElement.querySelector("span.css-643j0o")?.innerText.split(" - ");
        const sqmText = sqmPriceText?.[0].replace("m²", "").replace(",", ".");
        const sqm = parseFloat(sqmText);
        let pricePerSqm = null;
        if (sqmPriceText?.length > 1) {
            const pricePerSqmText = sqmPriceText[1].replace("zł/m²", "").replace(/\s/g, "");
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
			ad_link: link,
			is_private,
			image_url: imageUrl,
			property_type: propertyType,
		};

        ads.push(ad);
    });

    return ads;
}

function convertAreaFormat(areaText) {
    // Zamień przecinki na kropki i usuń niepotrzebne znaki, które nie są cyframi ani kropką
    const formattedAreaText = areaText.replace(',', '.').replace(/[^\d.]/g, '');
    return formattedAreaText;
}




function parseAdsNieruchomosciOnline(html, propertyType, adType) {
    const is_private = adType === 'private';
    const { document } = parseHTML(html);
    const ads = [];
    const adsElements = document.querySelectorAll('.tile-inner');
    const propertyTypeMap = {
        'mieszkanie': 'mieszkania',
        'dom': 'domy',
        'garaz': 'garaze-parkingi',
        'lokal-uzytkowy': 'biura-lokale',
        'pokoj': 'pokoje',
        'budynek-uzytkowy': 'hale-magazyny',
        'dzialka': 'dzialki',
    };
    
    const adjustedPropertyType = propertyTypeMap[propertyType] || propertyType;
    

    const currentDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    adsElements.forEach(adElement => {
        // Zdefiniuj zmienne przed blokiem if
        const titleElement = adElement.querySelector('.name a');
        const title = titleElement ? titleElement.textContent.trim() : "";

        const priceElement = adElement.querySelector('.title-a span');
        const price = priceElement ? priceElement.textContent.replace(/\D/g, '') : 0;

        const areaElement = adElement.querySelector('.area');
        // Pobierz tekst bezpośrednio, bez usuwania niecyfrowych znaków
        const areaText = areaElement ? areaElement.textContent : '0';
    
        // Konwersja formatu powierzchni
        const sqm = convertAreaFormat(areaText);

        const link = titleElement ? titleElement.getAttribute('href') : "";

        const locationElement = adElement.querySelector('.province');
        let location = locationElement ? locationElement.textContent.trim() : "";
        let district = "";
        let city = "Kraków"; // Zakładając, że wszystkie ogłoszenia dotyczą Krakowa
    
        // Spróbuj rozdzielić informacje o lokalizacji, jeśli zawierają więcej niż jedną nazwę
        if(location.includes("Kraków")) {
            const parts = location.split("Kraków");
            district = parts[0].trim(); // Przypisuje pierwszą część jako dzielnicę
        };

        const imageUrlElement = adElement.querySelector('.thumb-slider li a img');
        const imageUrl = imageUrlElement ? imageUrlElement.getAttribute('src') : "";

        let floor = "", rooms = "", furnished = ""; // Zainicjalizuj zmienne przed użyciem

        const attributesElement = adElement.querySelector('.tile-details-teaser table');
        if (attributesElement) {
            const floorElement = attributesElement.querySelector('tbody tr td:nth-child(1)');
            floor = floorElement ? floorElement.textContent.trim() : "";
            const roomsElement = attributesElement.querySelector('tbody tr td:nth-child(2)');
            rooms = roomsElement ? roomsElement.textContent.trim() : "";
            const furnishedElement = attributesElement.querySelector('tbody tr td:nth-child(3)');
            furnished = furnishedElement ? furnishedElement.textContent.trim() : "";
        }

        const ad = {
            title,
            price,
            city,
            district,
            sqm: parseFloat(sqm),
            ad_link: link,
            image_url: imageUrl,
            // furnished: furnished === 'tak', // Przekształć tekst na wartość logiczną
            date: currentDate,
            is_private,
            property_type: adjustedPropertyType,
            price_per_sqm: sqm && price ? Math.round(Number(price) / Number(sqm)) : null,
        };

        ads.push(ad);
    });

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


async function insertAds(ads, tableName) {
    for (const ad of ads) {
        const { data, error } = await supabase.from(tableName).upsert(ad);
        if (error) {
            console.error("Error inserting or updating data in the database:", error);
        }
    }
}
