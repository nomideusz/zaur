import { dev } from '$app/environment';
import fs from 'fs';
import path from 'path';

// Configuration
const FORCE_REAL_DATA = true; // Force real data even in development mode

// In SvelteKit, we'll use the built-in data storing capabilities
// Import types for our data structures
/** @typedef {Object} NewsItem
 * @property {string} id - Unique identifier
 * @property {string} title - News title
 * @property {string} summary - Summary text
 * @property {string} url - URL to the full article
 * @property {string} publishDate - ISO date string
 * @property {string} source - Source name
 * @property {string} sourceId - Source identifier
 * @property {string} category - Category identifier
 * @property {string} [imageUrl] - Optional image URL
 * @property {string} author - Author name
 */

/** @typedef {Object} NewsData
 * @property {string} lastUpdated - ISO date string of last update
 * @property {NewsItem[]} items - Array of news items
 * @property {Object.<string, string>} categories - Map of category IDs to names
 * @property {Array<{id: string, name: string, url: string, category: string, priority: number}>} sources - News sources
 */

// Import sample data with type assertion
/** @type {NewsItem[]} */
// @ts-ignore - Import JSON directly in SvelteKit
import sampleNewsData from './data/sample-news.json';

// Path to the news storage file
const NEWS_STORAGE_PATH = path.join(process.cwd(), 'src', 'lib', 'server', 'data', 'stored-news.json');
const NEWS_SOURCES_PATH = path.join(process.cwd(), 'src', 'lib', 'server', 'data', 'news.json');

// Define storage for news data
/** @type {NewsData|null} */
let newsData = null;

/**
 * Read news sources from the news.json file
 * @returns {Array<{id: string, name: string, url: string, category: string, priority: number}>} News sources
 */
function readNewsSources() {
  try {
    // Read sources from the news.json file
    if (fs.existsSync(NEWS_SOURCES_PATH)) {
      const sourcesData = JSON.parse(fs.readFileSync(NEWS_SOURCES_PATH, 'utf8'));
      return sourcesData.sources || [];
    }
    return [];
  } catch (error) {
    console.error('Error reading news sources:', error);
    return [];
  }
}

/**
 * Read news data from file
 * @returns {NewsData|null} The news data from file or null if not found
 */
function readFileNewsData() {
  try {
    // Check if the storage file exists
    if (fs.existsSync(NEWS_STORAGE_PATH)) {
      // Load data from file
      const fileData = fs.readFileSync(NEWS_STORAGE_PATH, 'utf8');
      /** @type {NewsData} */
      const data = JSON.parse(fileData);
      console.log(`Loaded ${data.items.length} news items from storage`);
      return data;
    }
  } catch (error) {
    console.error('Error reading news data from file:', error);
  }
  return null;
}

/**
 * Read news data from file or initialize if not exists
 * @returns {NewsData} The news data
 */
export function readNewsData() {
  if (newsData === null) {
    // Try to read from file first
    const fileData = readFileNewsData();
    
    if (fileData) {
      newsData = fileData;
    } else {
      // Initialize with basic structure if no file data
      newsData = {
        lastUpdated: new Date().toISOString(),
        items: [],
        categories: {
          tech: "Technology",
          programming: "Programming",
          design: "Design",
          business: "Business",
          science: "Science",
          products: "Products"
        },
        sources: readNewsSources()
      };
      
      // Load sample data if in dev mode and no items exist
      if (dev && !FORCE_REAL_DATA && newsData.items.length === 0) {
        newsData.items = [...sampleNewsData];
        newsData.lastUpdated = new Date().toISOString();
        console.log('Initialized with sample data in dev mode');
      }
    }
  }
  
  // At this point, newsData is guaranteed to be initialized
  // @ts-ignore - We've handled the null case above
  return newsData;
}

/**
 * Write news data to file
 * @param {NewsData} data The news data to write
 */
export function writeNewsData(data) {
  try {
    // Update the in-memory data
    newsData = data;
    
    // Create directory if it doesn't exist
    const dir = path.dirname(NEWS_STORAGE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write data to file (pretty-print with 2-space indent)
    fs.writeFileSync(NEWS_STORAGE_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Saved ${data.items.length} news items to ${NEWS_STORAGE_PATH}`);
  } catch (error) {
    console.error('Error writing news data:', error);
  }
}

/**
 * Get news items, optionally filtered by category
 * @param {string|null} category Optional category filter
 * @returns {Object} News data with items and metadata
 */
export function getNews(category = null) {
  const data = readNewsData();
  
  // Filter items by category if specified
  const items = category 
    ? data.items.filter(item => item.category === category)
    : data.items;
  
  // Sort items by date (newest first)
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );
  
  return {
    items: sortedItems,
    lastUpdated: data.lastUpdated,
    categories: data.categories
  };
}

/**
 * Update the news database with new items
 * @param {NewsItem[]} newItems Array of news items to add/update
 * @returns {NewsData} Updated news data
 */
export function updateNews(newItems) {
  const data = readNewsData();
  
  // Create a map of existing items by ID for quick lookup
  const existingItemsMap = new Map(
    data.items.map(item => [item.id, item])
  );
  
  // Add new items if they don't exist, or update if newer
  for (const item of newItems) {
    const existingItem = existingItemsMap.get(item.id);
    if (!existingItem || new Date(item.publishDate) > new Date(existingItem.publishDate)) {
      existingItemsMap.set(item.id, item);
    }
  }
  
  // Update the news data
  data.items = Array.from(existingItemsMap.values());
  data.lastUpdated = new Date().toISOString();
  
  // Write updated data back to memory and file
  writeNewsData(data);
  
  return data;
}

/**
 * Get available news categories
 * @returns {Array<{id: string, name: string}>} Array of category objects with id and name
 */
export function getCategories() {
  const data = readNewsData();
  return Object.entries(data.categories).map(([id, name]) => ({ id, name }));
}

/**
 * Limit the number of stored news items to prevent file growth
 * @param {number} maxItems Maximum number of items to keep
 * @returns {NewsData} Updated news data
 */
export function pruneNewsItems(maxItems = 100) {
  const data = readNewsData();
  
  if (data.items.length <= maxItems) {
    return data; // No pruning needed
  }
  
  console.log(`Pruning news items from ${data.items.length} to ${maxItems}`);
  
  // Sort by date (newest first) and take only the first maxItems
  data.items.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  data.items = data.items.slice(0, maxItems);
  
  // Update the lastUpdated timestamp
  data.lastUpdated = new Date().toISOString();
  
  // Write pruned data back
  writeNewsData(data);
  
  return data;
} 