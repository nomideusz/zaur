import { invokeTrigger } from "@trigger.dev/sdk";
import { client } from "../trigger";
import { fetchPageContent, parseAdsOLX, insertAds, getTableName } from "./scraper"; // Import funkcji

export const scrapeAds = client.defineJob({
  id: "scrape-ads",
  name: "Scrape Ads and Save to Database",
  version: "0.0.1",
  trigger: invokeTrigger(),


  run: async (payload, io, ctx) => {
    const endpointUrl = `http://109.123.250.191:5050/fetch-ads/${payload.service}/${payload.type}/${payload.category}/${payload.adType}`;
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

    return content;
  },
});

