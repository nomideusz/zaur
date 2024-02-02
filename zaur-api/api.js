import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { createClient } from '@supabase/supabase-js';
import { parseHTML } from 'linkedom';

// Supabase credentials
const SUPABASE_URL = 'https://nieco.pl';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MDYwNTA4MDAsCiAgImV4cCI6IDE4NjM5MDM2MDAKfQ.U0lyvLJWLePMupGI-aLB2Cb7bP-6ekNVaQl7MRTZsvU';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let browser;

async function fetchPageContent({ type, category, adType }) {
    const adTypeParam = adType === 'private' ? 'private' : 'business';
    const url = `https://www.olx.pl/nieruchomosci/${type}/${category}/krakow/?page=1&search%5Border%5D=created_at%3Adesc&search%5Bprivate_business%5D=${adTypeParam}&view=list`;

    if (!browser) {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: true,
            ignoreHTTPSErrors: true,
        });
    }

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await scrollToBottom(page);
    const content = await page.content();
    await page.close();
    return content;
}

async function scrollToBottom(page, timeout = 100) {
    const distance = 1000;
    const delay = timeout;

    await page.evaluate(async (distance, delay) => {
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
    }, distance, delay);
}

function parseAds(html, isPrivate, category, propertyType) {
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
		if (category === "sprzedaz") {
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
			property_type: propertyType,
		};
		ads.push(ad);
	}

    return ads;
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


async function runApi() {

    const [,, type, category, adType] = process.argv;
    console.log({type, category, adType});

    const tableName = category === "sprzedaz" ? "ads_sell" : "ads_rent";
    const htmlContent = await fetchPageContent({ type, category, adType });
    const ads = parseAds(htmlContent, adType === 'private', category, type);
    await insertAds(ads, tableName);
}

runApi().then(() => {
    console.log('API task completed.');
}).catch(error => {
    console.error('API task failed:', error);
});
