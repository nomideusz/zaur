// @ts-nocheck
import { initializeDatabase, closeConnection } from './newsStore.js';
import { initializeNewsUpdates } from './scripts/updateNews.js';

// Track initialization state
let isInitialized = false;
let newsUpdateJob = null;

/**
 * Initialize RethinkDB and start the news update scheduler
 * @returns {Promise<void>}
 */
export async function initializeRethinkDb() {
  if (isInitialized) {
    console.log('RethinkDB already initialized, skipping');
    return;
  }

  try {
    console.log('Initializing RethinkDB connection...');
    await initializeDatabase();
    console.log('RethinkDB initialization complete');
    
    // Start the news update scheduler (every 3 hours)
    console.log('Starting news update scheduler...');
    newsUpdateJob = initializeNewsUpdates();
    
    // Mark as initialized
    isInitialized = true;
    
    // Setup cleanup on shutdown
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    
    console.log('RethinkDB and news scheduler successfully initialized');
  } catch (error) {
    console.error('Error initializing RethinkDB:', error);
    throw error;
  }
}

/**
 * Clean up resources on shutdown
 */
async function cleanup() {
  console.log('Shutting down RethinkDB connections and jobs...');
  
  if (newsUpdateJob) {
    try {
      newsUpdateJob.cancel();
      console.log('News update scheduler stopped');
    } catch (error) {
      console.error('Error stopping news update scheduler:', error);
    }
  }
  
  try {
    await closeConnection();
  } catch (error) {
    console.error('Error closing RethinkDB connection:', error);
  }
  
  console.log('Cleanup complete');
}

// Initialize on module import for SvelteKit server
initializeRethinkDb().catch(error => {
  console.error('Failed to initialize RethinkDB:', error);
}); 