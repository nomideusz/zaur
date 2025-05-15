// Try to use SQLite but fall back to mock store if there are issues
import { initializeDatabase as initSqlite, readNewsData as readSqliteData, getCategories as getSqliteCategories, closeConnection as closeSqliteConnection } from './newsStoreSqlite.js';
import { initializeDatabase as initMock, readNewsData as readMockData, getCategories as getMockCategories, closeConnection as closeMockConnection } from './newsStoreMock.js';
import { initializeScheduler, cleanup as cleanupScheduler } from './newsFetchScheduler.js';

// Flag to track if store has been initialized
let isInitialized = false;
let usingSqlite = false;

/**
 * Initialize the news data store
 * @returns {void}
 */
export function initializeNewsStore() {
  if (isInitialized) {
    console.log('News store already initialized, skipping');
    return;
  }

  try {
    // Try SQLite first
    try {
      console.log('Attempting to initialize SQLite store...');
      initSqlite();
      console.log('SQLite store initialization successful');
      usingSqlite = true;
    } catch (sqliteError) {
      console.error('SQLite initialization failed, falling back to mock store:', sqliteError);
      console.log('Initializing mock store...');
      initMock();
      console.log('Mock store initialization complete');
      usingSqlite = false;
    }
    
    // Initialize the news fetch scheduler
    initializeScheduler();
    
    // Mark as initialized
    isInitialized = true;
    
    // Setup cleanup on shutdown
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    
    console.log(`News store successfully initialized (using: ${usingSqlite ? 'SQLite' : 'In-memory mock store'})`);
  } catch (error) {
    console.error('Error initializing news store:', error);
  }
}

/**
 * Cleanup function to run on application shutdown
 */
async function cleanup() {
  console.log('Shutting down news store...');
  cleanupScheduler();
  
  if (usingSqlite) {
    closeSqliteConnection();
  } else {
    closeMockConnection();
  }
  
  console.log('Shutdown complete');
}

// Export store functions with automatic fallback
export function readNewsData() {
  return usingSqlite ? readSqliteData() : readMockData();
}

export function getCategories() {
  return usingSqlite ? getSqliteCategories() : getMockCategories();
}

export function getActiveStoreType() {
  return usingSqlite ? 'sqlite' : 'mock';
}

// Initialize when this module is imported
initializeNewsStore(); 