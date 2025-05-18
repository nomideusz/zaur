// Support for PostgreSQL database with in-memory fallback
import { initializeDatabase as initPostgres, readNewsData as readPostgresData, getCategories as getPostgresCategories, closeConnection as closePostgresConnection } from './newsStorePostgres.js';
import { initializeDatabase as initMock, readNewsData as readMockData, getCategories as getMockCategories, closeConnection as closeMockConnection } from './newsStoreMock.js';
import { initializeScheduler, cleanup as cleanupScheduler } from './newsFetchScheduler.js';

// Flag to track if store has been initialized
let isInitialized = false;
let activeStore = 'mock'; // 'postgres' or 'mock'

/**
 * Initialize the news data store
 * @returns {Promise<void>}
 */
export async function initializeNewsStore() {
  if (isInitialized) {
    console.log('News store already initialized, skipping');
    return;
  }

  try {
    // Try PostgreSQL first
    try {
      console.log('Attempting to initialize PostgreSQL store...');
      await initPostgres();
      console.log('PostgreSQL store initialization successful');
      activeStore = 'postgres';
    } catch (postgresError) {
      console.error('PostgreSQL initialization failed, falling back to mock store:', postgresError);
      console.log('Initializing mock store...');
      initMock();
      console.log('Mock store initialization complete');
      activeStore = 'mock';
    }
    
    // Initialize the news fetch scheduler
    initializeScheduler();
    
    // Mark as initialized
    isInitialized = true;
    
    // Setup cleanup on shutdown
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    
    console.log(`News store successfully initialized (using: ${getActiveStoreDescription()})`);
  } catch (error) {
    console.error('Error initializing news store:', error);
  }
}

/**
 * Get a human-readable description of the active store
 */
function getActiveStoreDescription() {
  switch (activeStore) {
    case 'postgres': return 'PostgreSQL database';
    case 'mock': return 'In-memory mock store';
    default: return 'Unknown store type';
  }
}

/**
 * Cleanup function to run on application shutdown
 */
async function cleanup() {
  console.log('Shutting down news store...');
  cleanupScheduler();
  
  switch (activeStore) {
    case 'postgres':
      await closePostgresConnection();
      break;
    case 'mock':
      closeMockConnection();
      break;
  }
  
  console.log('Shutdown complete');
}

// Export store functions with automatic fallback based on active store
export async function readNewsData() {
  switch (activeStore) {
    case 'postgres': return await readPostgresData();
    default: return readMockData();
  }
}

export async function getCategories() {
  switch (activeStore) {
    case 'postgres': return await getPostgresCategories();
    default: return getMockCategories();
  }
}

export function getActiveStoreType() {
  return activeStore;
}

// Initialize when this module is imported
initializeNewsStore(); 