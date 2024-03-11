import { intervalTrigger } from "@trigger.dev/sdk";
import { client } from "../trigger";
import { toast } from 'svelte-sonner';

const services = ["olx", "nol", "gratka"];
const types = ["mieszkania", "domy", "dzialki"];
const categories = ["sprzedaz", "wynajem"];
const adTypes = ["private", "business"];

export const scrapeAds = client.defineJob({
	id: "scrape-ads",
	name: "Scrape Ads and Save to Database",
	version: "0.0.1",
	trigger: intervalTrigger({
		seconds: 4000,
	}),

	run: async (payload, io, ctx) => {
		toast.info('Zaur zauruje.');
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
				durationInMs: 40000,
				retry: {
					limit: 6,
					minTimeoutInMs: 1000,
					maxTimeoutInMs: 80000,
					factor: 2
				},
			}
		);

		return {
			message: "Content fetched successfully with random parameters.",
			content,
		};
	},
});
