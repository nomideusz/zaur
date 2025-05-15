// @ts-nocheck
import { fetchRealNews } from './newsFetcher.js';
import { getActiveStoreType } from './newsStoreInit.js';

// Configuration
const FETCH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
const INITIAL_DELAY_MS = 60 * 1000; // 1 minute initial delay to make sure server is fully up

// Store the interval reference for cleanup
let schedulerInterval = null;
let isInitialized = false;

/**
 * Initialize the news fetch scheduler
 */
export function initializeScheduler() {
  if (isInitialized) {
    console.log('News fetch scheduler already initialized, skipping');
    return;
  }

  console.log(`Initializing news fetch scheduler (interval: ${FETCH_INTERVAL_MS / (60 * 60 * 1000)} hours)`);
  
  // Initial fetch after a short delay
  const initialTimer = setTimeout(() => {
    console.log('Running initial scheduled news fetch...');
    fetchRealNews()
      .then(count => console.log(`Initial scheduled fetch completed: ${count} news items fetched`))
      .catch(error => console.error('Error in initial scheduled fetch:', error));
  }, INITIAL_DELAY_MS);
  
  // Set up recurring fetch
  schedulerInterval = setInterval(() => {
    console.log('Running scheduled news fetch...');
    fetchRealNews()
      .then(count => console.log(`Scheduled fetch completed: ${count} news items fetched`))
      .catch(error => console.error('Error in scheduled fetch:', error));
  }, FETCH_INTERVAL_MS);
  
  // Setup cleanup on shutdown
  process.on('SIGTERM', () => cleanup());
  process.on('SIGINT', () => cleanup());
  
  isInitialized = true;
  console.log('News fetch scheduler successfully initialized');
}

/**
 * Stop the scheduler and cleanup
 */
export function cleanup() {
  console.log('Stopping news fetch scheduler...');
  
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  
  isInitialized = false;
  console.log('News fetch scheduler stopped');
}

// Export a function to force an immediate fetch
export async function fetchNow() {
  console.log('Manually triggering news fetch...');
  try {
    // Debug the database path
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const expectedDbPath = path.join(__dirname, '../../..', 'data', 'zaur_news.db');
    
    console.log('Expected DB path:', expectedDbPath);
    console.log('DB directory exists:', fs.existsSync(path.dirname(expectedDbPath)));
    console.log('Using storage type:', getActiveStoreType());
    
    // Execute the fetch
    console.log('Starting news fetch...');
    try {
      const count = await fetchRealNews();
      console.log(`Manual fetch completed: ${count} news items fetched`);
      
      // Check if database file exists after fetch
      console.log('DB file exists after fetch:', fs.existsSync(expectedDbPath));
      
      return count;
    } catch (fetchError) {
      console.error('Error during news fetch:', fetchError);
      // Return a placeholder value so the API can still return a response
      return 0;
    }
  } catch (error) {
    console.error('Error in manual fetch setup:', error);
    return 0;
  }
} 