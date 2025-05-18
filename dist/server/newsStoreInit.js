// Support for PostgreSQL database with in-memory fallback
import { initializeDatabase as initPostgres, readNewsData as readPostgresData, getCategories as getPostgresCategories, closeConnection as closePostgresConnection, updateNews as updatePostgresNews, pruneNewsItems as prunePostgresItems, getNews as getPostgresNews, getComments as getPostgresComments, addComment as addPostgresComment, deleteComment as deletePostgresComment } from './newsStorePostgres.js';
import { initializeDatabase as initMock, readNewsData as readMockData, getCategories as getMockCategories, closeConnection as closeMockConnection, updateNews as updateMockNews, pruneNewsItems as pruneMockItems, getNews as getMockNews } from './newsStoreMock.js';
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

/**
 * Update news items in the database
 * @param {Array<any>} items Array of news items to add or update
 * @returns {Promise<{added: number, updated: number}>} Result with counts of added and updated items
 */
export async function updateNews(items) {
  switch (activeStore) {
    case 'postgres': return await updatePostgresNews(items);
    default: {
      // Use type assertion to handle potentially incompatible return type
      const result = await updateMockNews(items);
      return { 
        added: result && typeof result === 'object' && 'added' in result ? Number(result.added) : 0, 
        updated: result && typeof result === 'object' && 'updated' in result ? Number(result.updated) : 0 
      };
    }
  }
}

export async function pruneNewsItems(maxItems = 100) {
  switch (activeStore) {
    case 'postgres': return await prunePostgresItems(maxItems);
    default: return pruneMockItems(maxItems);
  }
}

export async function getNews(category = null) {
  switch (activeStore) {
    case 'postgres': return await getPostgresNews(category);
    default: return getMockNews(category);
  }
}

/**
 * Get comments for a specific news item
 * @param {string} newsId News item ID
 * @returns {Promise<Array<any>>} Comments for the news item
 */
export async function getComments(newsId) {
  if (activeStore === 'postgres') {
    return await getPostgresComments(newsId);
  }
  
  // Mock store doesn't support comments yet
  console.warn('Comments not supported in mock store');
  return [];
}

/**
 * Add a comment to a news item
 * @param {Object} comment Comment object with newsId, author, content
 * @returns {Promise<Object>} Result with success status and the added comment
 */
export async function addComment(comment) {
  if (activeStore === 'postgres') {
    return await addPostgresComment(comment);
  }
  
  // Mock store doesn't support comments yet
  console.warn('Comments not supported in mock store');
  return {
    success: false,
    error: 'Comments not supported in mock store'
  };
}

/**
 * Delete a comment
 * @param {string} commentId Comment ID to delete
 * @returns {Promise<Object>} Result with success status
 */
export async function deleteComment(commentId) {
  if (activeStore === 'postgres') {
    return await deletePostgresComment(commentId);
  }
  
  // Mock store doesn't support comments yet
  console.warn('Comments not supported in mock store');
  return {
    success: false,
    error: 'Comments not supported in mock store'
  };
}

export function getActiveStoreType() {
  return activeStore;
}

// Initialize when this module is imported
initializeNewsStore(); 