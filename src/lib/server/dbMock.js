// @ts-nocheck
import { dev } from '$app/environment';

// In-memory store for discovered items and comments
const inMemoryStore = {
  discoveries: [],
  comments: []
};

// Sample data for fallback mode
const sampleDiscoveries = [
  { 
    itemId: 'sample-1',
    timestamp: new Date().toISOString() 
  },
  { 
    itemId: 'sample-2',
    timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  },
  { 
    itemId: 'sample-3',
    timestamp: new Date(Date.now() - 172800000).toISOString() // 2 days ago
  }
];

const sampleComments = [
  { 
    id: '1', 
    itemId: 'sample-1', 
    comment: 'This is a sample comment for item 1', 
    timestamp: new Date().toISOString() 
  },
  { 
    id: '2', 
    itemId: 'sample-2', 
    comment: 'This is a sample comment for item 2', 
    timestamp: new Date(Date.now() - 86400000).toISOString() 
  },
  { 
    id: '3', 
    itemId: 'sample-3', 
    comment: 'This is a sample comment for item 3', 
    timestamp: new Date(Date.now() - 172800000).toISOString() 
  }
];

// Configuration
const config = {
  host: process.env.RETHINKDB_HOST || 'localhost',
  port: process.env.RETHINKDB_PORT ? parseInt(process.env.RETHINKDB_PORT) : 28015,
  db: process.env.RETHINKDB_DB || 'zaur_news'
};

/**
 * Initialize the in-memory store
 */
export function initializeStore() {
  // Load sample data if store is empty
  if (inMemoryStore.discoveries.length === 0) {
    inMemoryStore.discoveries = [...sampleDiscoveries];
    console.log(`Loaded ${inMemoryStore.discoveries.length} sample discoveries`);
  }
  
  if (inMemoryStore.comments.length === 0) {
    inMemoryStore.comments = [...sampleComments];
    console.log(`Loaded ${inMemoryStore.comments.length} sample comments`);
  }
  
  console.log('In-memory store initialized');
}

/**
 * Get database connection (mock for compatibility)
 */
export async function getConnection() {
  console.log(`Mock DB connection to ${config.host}:${config.port} (database: ${config.db})`);
  initializeStore();
  return { mockConnection: true };
}

/**
 * Close database connection (mock for compatibility)
 */
export async function closeConnection() {
  console.log('Mock DB connection closed');
  return true;
}

/**
 * Get all discovered item IDs
 */
export async function getDiscoveredItems() {
  initializeStore();
  return inMemoryStore.discoveries.map(item => item.itemId);
}

/**
 * Get all discovered items with timestamps
 */
export async function getDiscoveredItemsWithTimestamps() {
  initializeStore();
  
  // Return sorted by timestamp (newest first)
  return [...inMemoryStore.discoveries].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

/**
 * Add a new discovered item
 */
export async function addDiscoveredItem(itemId) {
  initializeStore();
  
  // Check if the item already exists
  const existingIndex = inMemoryStore.discoveries.findIndex(item => item.itemId === itemId);
  
  if (existingIndex >= 0) {
    // Update timestamp for existing item
    inMemoryStore.discoveries[existingIndex].timestamp = new Date().toISOString();
    console.log(`Discovery already exists for ${itemId}, updated timestamp`);
    return true;
  }
  
  // Add new item
  inMemoryStore.discoveries.push({
    itemId,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Added new discovery: ${itemId}`);
  return true;
}

/**
 * Get all comments
 */
export async function getComments() {
  initializeStore();
  return inMemoryStore.comments;
}

/**
 * Get comment for a specific item
 */
export async function getComment(itemId) {
  initializeStore();
  const comment = inMemoryStore.comments.find(c => c.itemId === itemId);
  return comment ? comment.comment : null;
}

/**
 * Save a comment for an item
 */
export async function saveComment(itemId, comment) {
  initializeStore();
  
  // Check if a comment already exists for this item
  const existingIndex = inMemoryStore.comments.findIndex(c => c.itemId === itemId);
  
  if (existingIndex >= 0) {
    // Update existing comment
    inMemoryStore.comments[existingIndex].comment = comment;
    inMemoryStore.comments[existingIndex].timestamp = new Date().toISOString();
    console.log(`Updated comment for item ${itemId}`);
  } else {
    // Add new comment
    inMemoryStore.comments.push({
      id: `${Date.now()}`, // Generate a simple ID
      itemId,
      comment,
      timestamp: new Date().toISOString()
    });
    console.log(`Added new comment for item ${itemId}`);
  }
  
  return true;
}

/**
 * Prune older discoveries to prevent memory growth
 */
export async function pruneDiscoveries(maxItems = 1000) {
  initializeStore();
  
  if (inMemoryStore.discoveries.length <= maxItems) {
    console.log(`No pruning needed, only have ${inMemoryStore.discoveries.length} discoveries (max: ${maxItems})`);
    return 0;
  }
  
  // Sort by timestamp (newest first)
  inMemoryStore.discoveries.sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  // Remove older items
  const itemsToRemove = inMemoryStore.discoveries.splice(maxItems);
  console.log(`Pruned ${itemsToRemove.length} older discoveries, keeping ${maxItems}`);
  
  return itemsToRemove.length;
}

/**
 * Get news items (stub for compatibility with RethinkDB version)
 */
export async function getNewsItems() {
  return [];
}

// Initialize the store when the module is imported
initializeStore(); 