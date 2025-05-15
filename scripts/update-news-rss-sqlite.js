#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { parseStringPromise } from 'xml2js';
import Database from 'better-sqlite3';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Database path
const dbPath = path.join(projectRoot, 'data', 'zaur_news.db');

// Configuration
const MAX_NEWS_ITEMS = 100; // Maximum number of items to keep

// Define interfaces
/**
 * @typedef {Object} RssItem
 * @property {string} title - Title of the item
 * @property {string} description - Description/content
 * @property {string} link - URL to the full article
 * @property {string} pubDate - Publication date
 * @property {string} guid - Unique identifier
 * @property {string} creator - Author
 * @property {string} enclosure - Image URL
 */

/**
 * @typedef {Object} NewsSource
 * @property {string} id - Source identifier
 * @property {string} name - Source name
 * @property {string} url - RSS feed URL
 * @property {string} category - Category identifier
 * @property {number} priority - Priority (higher = more important)
 */

/**
 * @typedef {Object} NewsItem
 * @property {string} id - Unique identifier
 * @property {string} title - News title
 * @property {string} summary - Summary text
 * @property {string} url - URL to the full article
 * @property {string} publishDate - ISO date string
 * @property {string} source - Source name
 * @property {string} sourceId - Source identifier
 * @property {string} category - Category identifier
 * @property {string|null} imageUrl - Optional image URL
 * @property {string} author - Author name
 */

/**
 * Read the news sources from the JSON file
 * @returns {Promise<NewsSource[]>} Array of news sources
 */
async function readNewsSources() {
  try {
    const sourcesPath = path.join(projectRoot, 'src', 'lib', 'server', 'data', 'news.json');
    const data = await fs.readFile(sourcesPath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.sources || [];
  } catch (error) {
    console.error('Error reading news sources:', error);
    return [];
  }
}

/**
 * Fetch and parse an RSS feed
 * @param {string} url - The URL of the RSS feed
 * @returns {Promise<RssItem[]>} The parsed feed items
 */
async function fetchRssFeed(url) {
  try {
    console.log(`Fetching RSS feed from ${url}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }
    
    const xml = await response.text();
    
    // Server-side XML parsing using xml2js
    const parsedResult = await parseStringPromise(xml, {
      explicitArray: false,
      trim: true
    });
    
    // Handle different RSS formats
    const channel = parsedResult.rss?.channel;
    if (!channel) {
      console.warn(`No channel found in RSS feed: ${url}`);
      return [];
    }
    
    // Process items
    const rssItems = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
    
    // Map to our simplified format
    return rssItems.map(function(item) {
      return {
        title: item.title || '',
        description: item.description || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        guid: item.guid?._?.toString() || item.guid?.toString() || '',
        creator: item['dc:creator'] || item.author || '',
        enclosure: item.enclosure?.url || ''
      };
    });
  } catch (error) {
    console.error(`Error fetching RSS feed from ${url}:`, error);
    return [];
  }
}

/**
 * Generate a deterministic ID from a feed item
 * @param {RssItem} item - The RSS feed item
 * @param {string} sourceId - The source ID
 * @returns {string} A unique ID
 */
function generateNewsItemId(item, sourceId) {
  // Create a simple hash function
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  // Use the guid if available, otherwise create a hash from title and link
  if (item.guid) {
    return `${sourceId}-${simpleHash(item.guid)}`;
  }
  
  const hash = simpleHash(`${item.title}${item.link}`);
  return `${sourceId}-${hash}`;
}

/**
 * Convert RSS feed items to NewsItem format
 * @param {RssItem[]} rssItems - The RSS feed items
 * @param {NewsSource} source - The source information
 * @returns {NewsItem[]} The converted NewsItems
 */
function convertRssToNewsItems(rssItems, source) {
  return rssItems.map(item => {
    // Parse date or use current date if parsing fails
    let publishDate;
    try {
      publishDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
    } catch (error) {
      publishDate = new Date().toISOString();
    }
    
    return {
      id: generateNewsItemId(item, source.id),
      title: item.title,
      summary: item.description?.replace(/<[^>]*>/g, '').substring(0, 200) + '...' || 'No description available',
      url: item.link,
      publishDate,
      source: source.name,
      sourceId: source.id,
      category: source.category,
      imageUrl: item.enclosure || null,
      author: item.creator || 'Unknown'
    };
  });
}

/**
 * Get the newest article timestamp from the SQLite database
 * @param {Database} db - SQLite database connection
 * @returns {Date} Date of the newest article
 */
function getNewestArticleTimestamp(db) {
  try {
    // Get newest article by publish date
    const newestItem = db.prepare('SELECT publishDate FROM news ORDER BY publishDate DESC LIMIT 1').get();
    
    if (newestItem && newestItem.publishDate) {
      const timestamp = new Date(newestItem.publishDate);
      console.log(`Newest existing article timestamp: ${timestamp.toISOString()}`);
      return timestamp;
    }
    
    console.log('No existing articles found, using epoch start');
    return new Date(0); // Default to epoch start
  } catch (error) {
    console.error('Error getting newest article timestamp:', error);
    return new Date(0); // Default to epoch start on error
  }
}

/**
 * Insert news items into SQLite database
 * @param {Database} db - SQLite database connection
 * @param {NewsItem[]} newsItems - News items to insert
 * @returns {Object} Information about added/updated items
 */
function insertNewsItems(db, newsItems) {
  let added = 0;
  let updated = 0;
  
  try {
    // Prepare statements
    const checkExisting = db.prepare('SELECT id FROM news WHERE id = ?');
    const insertItem = db.prepare(`
      INSERT OR REPLACE INTO news (
        id, title, summary, url, publishDate, source, sourceId, category, imageUrl, author
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Process in batches to avoid "too many parameters" error
    const BATCH_SIZE = 10; // Reduced to handle SQLite parameter limits
    
    // Process each batch
    for (let i = 0; i < newsItems.length; i += BATCH_SIZE) {
      const batch = newsItems.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(newsItems.length / BATCH_SIZE)} (${batch.length} items)`);
      
      // Use a transaction for better performance
      const transaction = db.transaction((items) => {
        for (const item of items) {
          // Check if item already exists
          const existing = checkExisting.get(item.id);
          
          if (existing) {
            updated++;
          } else {
            added++;
          }
          
          // Insert or replace the item
          insertItem.run(
            item.id,
            item.title,
            item.summary || '',
            item.url || '',
            item.publishDate || new Date().toISOString(),
            item.source || '',
            item.sourceId || '',
            item.category || '',
            item.imageUrl || null,
            item.author || ''
          );
        }
      });
      
      // Run the transaction for this batch
      transaction(batch);
    }
    
    return { added, updated, total: newsItems.length };
  } catch (error) {
    console.error('Error inserting news items:', error);
    return { added, updated, total: 0 };
  }
}

/**
 * Delete older news items, keeping only the latest ones
 * @param {Database} db - SQLite database connection
 * @param {number} maxItems - Maximum number of items to keep
 * @returns {number} Number of items deleted
 */
function pruneOldNewsItems(db, maxItems) {
  try {
    // Count total items
    const countResult = db.prepare('SELECT COUNT(*) as count FROM news').get();
    const totalItems = countResult ? countResult.count : 0;
    
    if (totalItems <= maxItems) {
      console.log(`Only ${totalItems} items in database, no pruning needed`);
      return 0;
    }
    
    const itemsToDelete = totalItems - maxItems;
    
    // Delete the oldest items
    const result = db.prepare(`
      DELETE FROM news 
      WHERE id IN (
        SELECT id FROM news 
        ORDER BY publishDate ASC 
        LIMIT ?
      )
    `).run(itemsToDelete);
    
    console.log(`Pruned ${result.changes} old news items`);
    return result.changes;
  } catch (error) {
    console.error('Error pruning old news items:', error);
    return 0;
  }
}

/**
 * Main function to update news from RSS feeds
 */
async function updateNewsFromRssFeeds() {
  console.log('Starting RSS news update process (using SQLite)...');
  let db = null;
  
  try {
    // Connect to SQLite
    db = new Database(dbPath);
    console.log(`Connected to SQLite database at ${dbPath}`);
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT,
        publishDate TEXT,
        source TEXT,
        sourceId TEXT,
        category TEXT,
        imageUrl TEXT,
        author TEXT
      )
    `);
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_news_sourceId ON news(sourceId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_news_publishDate ON news(publishDate)`);
    
    // Read news sources
    const sources = await readNewsSources();
    if (sources.length === 0) {
      console.warn('No news sources found, cannot update');
      return;
    }
    
    console.log(`Found ${sources.length} news sources to process`);
    
    // Get the newest article timestamp for filtering
    const newestExistingTimestamp = getNewestArticleTimestamp(db);
    
    // Sort sources by priority (higher = more important)
    const sortedSources = [...sources].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Process each source
    const allNewsItems = [];
    let newItemsCount = 0;
    let skippedItemsCount = 0;
    
    for (const source of sortedSources) {
      console.log(`Fetching from ${source.name} (${source.url})...`);
      
      const rssItems = await fetchRssFeed(source.url);
      
      if (rssItems.length > 0) {
        // Filter items that are newer than our newest existing item
        const newRssItems = rssItems.filter(item => {
          try {
            const itemDate = new Date(item.pubDate);
            return itemDate > newestExistingTimestamp;
          } catch (e) {
            // If we can't parse the date, include the item to be safe
            return true;
          }
        });
        
        // Count skipped items
        skippedItemsCount += (rssItems.length - newRssItems.length);
        
        // Only process newer items
        const newsItems = convertRssToNewsItems(newRssItems, source);
        allNewsItems.push(...newsItems);
        newItemsCount += newsItems.length;
        
        console.log(`Found ${newsItems.length} new items from ${source.name} (skipped ${rssItems.length - newRssItems.length} older items)`);
      } else {
        console.log(`No items found from ${source.name}`);
      }
    }
    
    console.log(`Processing complete: ${newItemsCount} new items found, ${skippedItemsCount} older items skipped`);
    
    if (allNewsItems.length > 0) {
      // Update news database with new items
      const result = insertNewsItems(db, allNewsItems);
      console.log(`News items saved to SQLite. Added: ${result.added}, Updated: ${result.updated}`);
    } else {
      console.log('No new items found from any source');
    }
    
    // Prune old news items
    pruneOldNewsItems(db, MAX_NEWS_ITEMS);
    
    console.log('News update completed successfully');
  } catch (error) {
    console.error('Error during news update:', error);
  } finally {
    // Close database connection
    if (db) {
      db.close();
      console.log('Database connection closed');
    }
  }
}

// Run the update
updateNewsFromRssFeeds().then(() => {
  console.log('RSS feed update completed');
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error during update:', error);
  process.exit(1);
}); 