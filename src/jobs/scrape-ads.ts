import { invokeTrigger } from "@trigger.dev/sdk";
import { client } from "../trigger";
import { fetchPageContent, parseAdsOLX, insertAds, getTableName } from "./scraper"; // Import funkcji

export const scrapeAds = client.defineJob({
  id: "scrape-ads",
  name: "Scrape Ads and Save to Database",
  version: "0.0.1",
  trigger: invokeTrigger(),
  run: async (payload, io, ctx) => {

    const content = await io.runTask("fetch-content", async () => {
      return await fetchPageContent({
        service: payload.service,
        type: payload.type,
        category: payload.category,
        adType: payload.adType
      });
    }, { name: "Fetch Page Content" });

    const ads = await io.runTask("parse-olx-ads", async () => {
      return parseAdsOLX(content, payload.type, payload.adType);
    }, { name: "Parse OLX Ads" });

    const tableName = getTableName(payload.category);

    await io.runTask("insert-ads", async () => {
      return insertAds(ads, tableName);
    }, { name: "Insert Ads to Database" });

    return {
      message: "Page content fetched and ads extracted successfully. Ads inserted to database."
    };
  },
});