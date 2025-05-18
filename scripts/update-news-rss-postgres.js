// Script to fetch RSS feeds and update news in the PostgreSQL database
import { initializeDatabase, closeConnection } from '../src/lib/server/newsStorePostgres.js';
import { fetchAllRssFeeds } from '../src/lib/server/scripts/fetchRssFeeds.js';
import { pruneNewsItems } from '../src/lib/server/newsStoreInit.js';

// Main function to execute script
async function main() {
  try {
    console.log('Starting RSS feed update process...');
    console.log('Initializing PostgreSQL database...');
    await initializeDatabase();
    
    console.log('Fetching and processing RSS feeds...');
    const result = await fetchAllRssFeeds();
    
    console.log(`RSS feed update complete. Added: ${result.added}, Updated: ${result.updated}, Total new items: ${result.total}`);
    
    console.log('Pruning old news items...');
    const pruneResult = await pruneNewsItems(500); // Keep more items for RSS feeds
    console.log(`Pruned ${pruneResult.removed} old news items`);
    
    // Close database connection when done
    await closeConnection();
    console.log('Database connection closed. Update complete.');
  } catch (error) {
    console.error('Error updating news from RSS feeds:', error);
    process.exit(1);
  }
}

// Run the script
main(); 