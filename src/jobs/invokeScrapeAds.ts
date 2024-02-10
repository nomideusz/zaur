import { scrapeAds } from './scrape-ads';

async function invokeScrapeJob() {
  const payload = {
    service: 'olx',
    type: 'mieszkania',
    category: 'sprzedaz',
    adType: 'private'
  };

  const jobRun = await scrapeAds.invoke(payload);
  console.log('Job invoked', jobRun);
}

invokeScrapeJob();
