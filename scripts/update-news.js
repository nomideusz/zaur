#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import * as db from '../src/lib/server/db.js';
import { fetchAllRssFeeds } from '../src/lib/server/scripts/fetchRssFeeds.js';
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
    await db.getConnection();
    
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
      const savedCount = await db.saveNewsItems(newItems);
      console.log(`Saved ${savedCount} new items to database`);
    }
    
    // 5. Prune old items
    const prunedCount = await db.pruneNewsItems(MAX_NEWS_ITEMS, MAX_AGE_DAYS);
    if (prunedCount > 0) {
      console.log(`Pruned ${prunedCount} old news items`);
    }
    
    // 6. Close database connection
    await db.closeConnection();
    console.log('News update completed successfully');
  } catch (error) {
    console.error('Error during news update:', error);
    process.exit(1);
  }
}

// Run the update
updateNews().then(() => process.exit(0)); 