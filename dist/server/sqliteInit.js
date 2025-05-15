import { initializeDatabase, getCategories, readNewsData, closeConnection } from './newsStoreSqlite.js';

// Flag to track if SQLite has been initialized
let isInitialized = false;

/**
 * Initialize SQLite database
 * @returns {void}
 */
export function initializeSqlite() {
  if (isInitialized) {
    console.log('SQLite already initialized, skipping');
    return;
  }

  try {
    console.log('Initializing SQLite database...');
    initializeDatabase();
    console.log('SQLite initialization complete');
    
    // Mark as initialized
    isInitialized = true;
    
    // Setup cleanup on shutdown
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    
    console.log('SQLite successfully initialized');
  } catch (error) {
    console.error('Error initializing SQLite:', error);
  }
}

/**
 * Cleanup function to run on application shutdown
 */
async function cleanup() {
  console.log('Shutting down SQLite connections...');
  closeConnection();
  console.log('Shutdown complete');
}

// Initialize SQLite when this module is imported
initializeSqlite(); 