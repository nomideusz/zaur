import { intervalTrigger } from "@trigger.dev/sdk";
import { client } from "../trigger";

const services = ["olx"]; // Przykładowa lista serwisów
const types = ["mieszkania", "domy"]; // Przykładowe typy nieruchomości
const categories = ["sprzedaz", "wynajem"]; // Przykładowe kategorie
const adTypes = ["private", "business"]; // Przykładowe typy ogłoszeń

export const scrapeAds = client.defineJob({
	id: "scrape-ads",
	name: "Scrape Ads and Save to Database",
	version: "0.0.1",
	trigger: intervalTrigger({
		seconds: 600,
	}),

	run: async (payload, io, ctx) => {
		const serviceIndex = Math.floor(Math.random() * services.length);
		const typeIndex = Math.floor(Math.random() * types.length);
		const categoryIndex = Math.floor(Math.random() * categories.length);
		const adTypeIndex = Math.floor(Math.random() * adTypes.length);
		const dynamicPayload = {
			service: services[serviceIndex],
			type: types[typeIndex],
			category: categories[categoryIndex],
			adType: adTypes[adTypeIndex],
		};
		const endpointUrl = `http://109.123.250.191:5050/fetch-ads/${dynamicPayload.service}/${dynamicPayload.type}/${dynamicPayload.category}/${dynamicPayload.adType}`;
		const content = await io.backgroundFetch(
			"fetch-content",
			endpointUrl,
			{
				method: "GET",
			},
			{},
			{
				durationInMs: 60000,
				retry: {
					limit: 6,
					minTimeoutInMs: 1000,
					maxTimeoutInMs: 60000,
					factor: 2,
					randomize: true,
				},
			}
		);

		return {
			message: "Content fetched successfully with random parameters.",
			content,
		};
	},
});
