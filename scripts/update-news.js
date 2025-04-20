// This file is a simple wrapper for the updateNews.js script
// You can run this from a cron job like: 
// */30 * * * * node scripts/update-news.js > logs/news-update.log 2>&1

import { fetchAndUpdateNews } from '../src/lib/server/scripts/updateNews.js';

console.log('Starting scheduled news update...');
fetchAndUpdateNews().then(() => {
  console.log('News update completed');
}).catch(error => {
  console.error('Error in scheduled news update:', error);
}); 