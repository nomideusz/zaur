// Support for PostgreSQL database with in-memory fallback
import { initializeDatabase as initPostgres, readNewsData as readPostgresData, getCategories as getPostgresCategories, closeConnection as closePostgresConnection, updateNews as updatePostgresNews, pruneNewsItems as prunePostgresItems, getNews as getPostgresNews, getComments as getPostgresComments, addComment as addPostgresComment, deleteComment as deletePostgresComment, getDiscoveredItems as getPostgresDiscoveredItems, getDiscoveredItemsWithTimestamps as getPostgresDiscoveredItemsWithTimestamps, addDiscoveredItem as addPostgresDiscoveredItem, getZaurComments as getPostgresZaurComments, getZaurComment as getPostgresZaurComment, saveZaurComment as savePostgresZaurComment, pruneDiscoveries as prunePostgresDiscoveries } from './newsStorePostgres.js';
import { initializeDatabase as initMock, readNewsData as readMockData, getCategories as getMockCategories, closeConnection as closeMockConnection, updateNews as updateMockNews, pruneNewsItems as pruneMockItems, getNews as getMockNews } from './newsStoreMock.js';
import { getDiscoveredItems as getMockDiscoveredItems, getDiscoveredItemsWithTimestamps as getMockDiscoveredItemsWithTimestamps, addDiscoveredItem as addMockDiscoveredItem, getComments as getMockComments, saveComment as saveMockComment, getComment as getMockComment, pruneDiscoveries as pruneMockDiscoveries } from './dbMock.js';
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
 * Get all discovered item IDs
 * @returns {Promise<Array<string>>} Array of discovered item IDs
 */
export async function getDiscoveredItems() {
  switch (activeStore) {
    case 'postgres': return await getPostgresDiscoveredItems();
    default: return await getMockDiscoveredItems();
  }
}

/**
 * Get all discovered items with timestamps
 * @returns {Promise<Array<{itemId: string, timestamp: string}>>} Array of discovered items with timestamps
 */
export async function getDiscoveredItemsWithTimestamps() {
  switch (activeStore) {
    case 'postgres': return await getPostgresDiscoveredItemsWithTimestamps();
    default: return await getMockDiscoveredItemsWithTimestamps();
  }
}

/**
 * Add a new discovered item
 * @param {string} itemId Item ID to add or update
 * @returns {Promise<boolean>} Success indicator
 */
export async function addDiscoveredItem(itemId) {
  switch (activeStore) {
    case 'postgres': return await addPostgresDiscoveredItem(itemId);
    default: return await addMockDiscoveredItem(itemId);
  }
}

/**
 * Get all Zaur's comments
 * @returns {Promise<Array<{itemId: string, comment: string}>>} Array of comments
 */
export async function getZaurComments() {
  switch (activeStore) {
    case 'postgres': return await getPostgresZaurComments();
    default: return await getMockComments();
  }
}

/**
 * Get a specific Zaur comment
 * @param {string} itemId The item ID to get the comment for
 * @returns {Promise<string|null>} The comment or null
 */
export async function getZaurComment(itemId) {
  switch (activeStore) {
    case 'postgres': return await getPostgresZaurComment(itemId);
    default: return await getMockComment(itemId);
  }
}

/**
 * Save a Zaur comment
 * @param {string} itemId Item ID to add comment for
 * @param {string} comment The comment text
 * @returns {Promise<boolean>} Success indicator
 */
export async function saveZaurComment(itemId, comment) {
  switch (activeStore) {
    case 'postgres': return await savePostgresZaurComment(itemId, comment);
    default: return await saveMockComment(itemId, comment);
  }
}

/**
 * Prune older discoveries to prevent database/memory growth
 * @param {number} maxItems Maximum number of items to keep
 * @returns {Promise<number>} Number of items deleted
 */
export async function pruneDiscoveries(maxItems = 1000) {
  switch (activeStore) {
    case 'postgres': return await prunePostgresDiscoveries(maxItems);
    default: return await pruneMockDiscoveries(maxItems);
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