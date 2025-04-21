#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import { getConnection, closeConnection, saveNewsItems, deleteOldNewsItems } from '../src/lib/server/db.ts';
import { fetchAllRssFeeds } from '../src/lib/server/scripts/fetchRssFeeds-simple.ts';
import fs from 'fs/promises';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MAX_NEWS_ITEMS = 100; // Maximum number of items to keep
const MAX_AGE_DAYS = 30; // Maximum age for news items in days

async function readNewsSourcesData() {
  try {
    const sourcesPath = path.resolve(__dirname, '../src/lib/server/data/news.json');
    const data = await fs.readFile(sourcesPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading news sources:', error);
    return { sources: [] };
  }
}

async function updateNews() {
  console.log('Starting news update process...');
  
  try {
    // 1. Connect to database
    await getConnection();
    
    // 2. Read news sources configuration
    const newsConfig = await readNewsSourcesData();
    
    if (!newsConfig.sources || newsConfig.sources.length === 0) {
      console.error('No news sources found');
      return;
    }
    
    console.log(`Found ${newsConfig.sources.length} news sources to process`);
    
    // 3. Fetch all RSS feeds
    console.log('Fetching RSS feeds...');
    const newItems = await fetchAllRssFeeds(newsConfig.sources);
    console.log(`Fetched ${newItems.length} news items from RSS feeds`);
    
    if (newItems.length > 0) {
      // 4. Save new items to database
      const savedCount = await saveNewsItems(newItems);
      console.log(`Saved ${savedCount} new items to database`);
    }
    
    // 5. Prune old items (delete items older than MAX_AGE_DAYS)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);
    const prunedCount = await deleteOldNewsItems(cutoffDate);
    if (prunedCount > 0) {
      console.log(`Pruned ${prunedCount} old news items older than ${MAX_AGE_DAYS} days`);
    }
    
    // 6. Close database connection
    await closeConnection();
    console.log('News update completed successfully');
  } catch (error) {
    console.error('Error during news update:', error);
    process.exit(1);
  }
}

// Run the update
updateNews().then(() => process.exit(0)); 