import { readNewsData, updateNews, pruneNewsItems } from '../newsStore.js';
import { dev } from '$app/environment';
import { fetchAllRssFeeds } from './fetchRssFeeds.js';

// Configuration
const MAX_NEWS_ITEMS = 100; // Maximum number of items to keep
const FORCE_REAL_FEEDS = true; // Force real feeds even in development mode
const FORCE_UPDATE = true;     // Force updates regardless of time since last update

/**
 * Fetch and update news data
 * For SvelteKit server environment
 */
export async function fetchAndUpdateNews() {
  console.log('Starting news update...', new Date().toISOString());
  
  try {
    // Get existing news data
    const newsData = readNewsData();
    
    // Check if last update was less than 60 minutes ago
    const lastUpdateTime = new Date(newsData.lastUpdated).getTime();
    const currentTime = new Date().getTime();
    const timeSinceLastUpdate = currentTime - lastUpdateTime;
    const oneHourInMs = 60 * 60 * 1000;
    
    // Skip update if it's been less than an hour since the last update
    // and FORCE_UPDATE is false
    if (timeSinceLastUpdate < oneHourInMs && !FORCE_UPDATE) {
      console.log(`Skipping news update - last update was only ${Math.floor(timeSinceLastUpdate / 60000)} minutes ago`);
      return newsData;
    }
    
    // Always log when forcing update
    if (FORCE_UPDATE) {
      console.log(`Forcing news update despite last update being ${Math.floor(timeSinceLastUpdate / 60000)} minutes ago`);
    }
    
    const sources = newsData.sources || [];
    
    if (sources.length === 0) {
      console.warn('No sources defined in news data');
      return;
    }
    
    // Use sample data only in dev mode AND when FORCE_REAL_FEEDS is false
    if (dev && !FORCE_REAL_FEEDS) {
      console.log('Development mode: using sample news data...');
      try {
        // In SvelteKit, we can directly import JSON files
        const sampleDataModule = await import('$lib/server/data/sample-news.json');
        const sampleData = sampleDataModule.default;
        
        // Update with sample data items
        const updatedData = updateNews(sampleData.items || []);
        console.log(`News updated successfully (dev mode). ${updatedData.items.length} items available.`);
        
        // Prune news items to prevent excessive growth
        pruneNewsItems(MAX_NEWS_ITEMS);
        
        return updatedData;
      } catch (error) {
        console.error('Error loading sample data:', error);
        // Continue with real feeds as fallback
      }
    }
    
    // In production mode or when forced, fetch from real RSS feeds
    console.log('Fetching real RSS feeds...');
    const result = await fetchAllRssFeeds();
    
    // Prune news items to prevent excessive growth
    pruneNewsItems(MAX_NEWS_ITEMS);
    
    return result;
  } catch (error) {
    console.error('Error updating news:', error);
    throw error;
  }
}

/**
 * Set up scheduled news updates
 * @param {number} intervalMinutes - Interval in minutes (default: 60)
 */
export function setupScheduledNewsUpdates(intervalMinutes = 60) {
  // Convert minutes to milliseconds
  const interval = intervalMinutes * 60 * 1000;
  
  console.log(`Setting up scheduled news updates every ${intervalMinutes} minutes (${interval} ms)`);
  
  // Skip initial update since we're already calling it in hooks.server.ts
  // This prevents double-initialization
  
  // Schedule regular updates - ensure we use the correct interval
  const timer = setInterval(() => {
    const now = new Date();
    console.log(`Running scheduled news update at ${now.toISOString()} with ${intervalMinutes} minute interval...`);
    fetchAndUpdateNews().catch(err => console.error('Error in scheduled news update:', err));
  }, interval);
  
  return timer;
} 