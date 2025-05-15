#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { initializeDatabase, updateNews, pruneNewsItems, closeConnection } from '../src/lib/server/newsStoreSqlite.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MAX_NEWS_ITEMS = 100; // Maximum number of items to keep

async function readSampleNewsData() {
  try {
    const samplePath = path.resolve(__dirname, '../src/lib/server/data/sample-news.json');
    const data = await fs.readFile(samplePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading sample news data:', error);
    return { items: [] };
  }
}

async function updateNewsData() {
  console.log('Starting news update process (using SQLite)...');
  
  try {
    // 1. Initialize SQLite database
    console.log('Initializing SQLite database...');
    initializeDatabase();
    
    // 2. Read sample news data
    console.log('Reading sample news data...');
    const sampleData = await readSampleNewsData();
    
    if (!sampleData.items || sampleData.items.length === 0) {
      console.error('No sample news items found');
      return;
    }
    
    console.log(`Found ${sampleData.items.length} sample news items`);
    
    // 3. Save sample items to database
    const result = updateNews(sampleData.items);
    console.log(`Saved ${result.added} news items to database (${result.updated} updated)`);
    
    // 4. Prune old items to keep only the most recent ones
    const prunedCount = pruneNewsItems(MAX_NEWS_ITEMS);
    if (prunedCount > 0) {
      console.log(`Pruned ${prunedCount} old news items`);
    }
    
    // 5. Close database connection
    closeConnection();
    console.log('News update completed successfully');
  } catch (error) {
    console.error('Error during news update:', error);
    process.exit(1);
  }
}

// Run the update
updateNewsData().then(() => process.exit(0)); 