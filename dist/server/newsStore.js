// @ts-nocheck
import { dev } from '$app/environment';
import rethinkdb from 'rethinkdb';
import path from 'path';

// Configuration
const FORCE_REAL_DATA = true; // Force real data even in development mode

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

// RethinkDB configuration
const DB_CONFIG = {
  host: process.env.RETHINKDB_HOST || 'localhost',
  port: parseInt(process.env.RETHINKDB_PORT || '28015', 10),
  db: process.env.RETHINKDB_DB || 'zaur_news'
};

// Connection pool - will be initialized on first use
/** @type {rethinkdb.Connection|null} */
let connectionPool = null;

/**
 * Get a connection to RethinkDB
 * @returns {Promise<rethinkdb.Connection>} RethinkDB connection
 */
async function getConnection() {
  if (!connectionPool) {
    try {
      console.log(`Connecting to RethinkDB at ${DB_CONFIG.host}:${DB_CONFIG.port} (database: ${DB_CONFIG.db})...`);
      connectionPool = await rethinkdb.connect({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port
      });
      
      // Set the default database
      connectionPool.use(DB_CONFIG.db);
      
      console.log('Successfully connected to RethinkDB');
    } catch (error) {
      console.error('Error connecting to RethinkDB:', error);
      throw error;
    }
  }
  
  return connectionPool;
}

/**
 * Initialize the database (create if not exists)
 * @returns {Promise<void>}
 */
export async function initializeDatabase() {
  try {
    const conn = await getConnection();
    
    // Check if database exists
    const dbs = await rethinkdb.dbList().run(conn);
    if (!dbs.includes(DB_CONFIG.db)) {
      console.log(`Creating database '${DB_CONFIG.db}'...`);
      await rethinkdb.dbCreate(DB_CONFIG.db).run(conn);
    }
    
    // Switch to our database
    conn.use(DB_CONFIG.db);
    
    // Check if tables exist and create them if needed
    const tables = await rethinkdb.tableList().run(conn);
    
    // Create news table if it doesn't exist
    if (!tables.includes('news')) {
      console.log("Creating 'news' table...");
      await rethinkdb.tableCreate('news').run(conn);
      
      // Create indexes for news table
      await rethinkdb.table('news').indexCreate('category').run(conn);
      await rethinkdb.table('news').indexCreate('sourceId').run(conn);
      await rethinkdb.table('news').indexCreate('publishDate').run(conn);
      await rethinkdb.table('news').indexWait().run(conn);
    }
    
    // Create sources table if it doesn't exist
    if (!tables.includes('sources')) {
      console.log("Creating 'sources' table...");
      await rethinkdb.tableCreate('sources').run(conn);
      
      // Create indexes for sources table
      await rethinkdb.table('sources').indexCreate('category').run(conn);
      await rethinkdb.table('sources').indexWait().run(conn);
    }
    
    // Create categories table if it doesn't exist
    if (!tables.includes('categories')) {
      console.log("Creating 'categories' table...");
      await rethinkdb.tableCreate('categories').run(conn);
    }
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get default categories if none are stored
 * @returns {Object.<string, string>} Map of category IDs to names
 */
function getDefaultCategories() {
  return {
    ai: "Artificial Intelligence",
    dev: "Development",
    crypto: "Cryptocurrency", 
    productivity: "Productivity",
    tools: "Tools & Utilities",
    philosophy: "Philosophy"
  };
}

/**
 * Read news data from database
 * @returns {Promise<NewsData>} The news data
 */
export async function readNewsData() {
  try {
    await initializeDatabase();
    const conn = await getConnection();
    
    // Get news items
    const cursor = await rethinkdb.table('news').run(conn);
    const items = await cursor.toArray();
    
    // Get categories
    const categoriesCursor = await rethinkdb.table('categories').run(conn);
    const categoriesArray = await categoriesCursor.toArray();
    
    // Convert categories array to object
    /** @type {Object.<string, string>} */
    const categories = {};
    for (const category of categoriesArray) {
      if (category && typeof category === 'object' && 'id' in category && 'name' in category) {
        categories[category.id] = category.name;
      }
    }
    
    // Get sources
    const sourcesCursor = await rethinkdb.table('sources').run(conn);
    const sources = await sourcesCursor.toArray();
    
    // If there are no items, use sample data in dev mode
    if (items.length === 0) {
      console.log('No items found in database, using sample data');
      
      // Load default categories if needed
      if (Object.keys(categories).length === 0) {
        const defaultCategories = getDefaultCategories();
        
        // Convert to array for insertion
        const categoriesToInsert = Object.entries(defaultCategories).map(([id, name]) => ({ id, name }));
        
        // Insert categories
        await rethinkdb.table('categories').insert(categoriesToInsert).run(conn);
        
        // Update categories object for return
        Object.assign(categories, defaultCategories);
      }
      
      // Use sample data in dev mode
      if (dev && !FORCE_REAL_DATA) {
        try {
          // Insert sample data
          await rethinkdb.table('news').insert(sampleNewsData.items).run(conn);
          console.log(`Inserted ${sampleNewsData.items.length} sample news items`);
          
          // Return with sample data
          return {
            lastUpdated: new Date().toISOString(),
            items: sampleNewsData.items,
            categories,
            sources
          };
        } catch (sampleError) {
          console.error('Error inserting sample data:', sampleError);
        }
      }
    }
    
    return {
      lastUpdated: new Date().toISOString(),
      items,
      categories: Object.keys(categories).length > 0 ? categories : getDefaultCategories(),
      sources
    };
  } catch (error) {
    console.error('Error reading news data from database:', error);
    
    // Return empty data with default categories on error
    return {
      lastUpdated: new Date().toISOString(),
      items: [],
      categories: getDefaultCategories(),
      sources: []
    };
  }
}

/**
 * Get news items, optionally filtered by category
 * @param {string|null} category Optional category filter
 * @returns {Promise<Object>} News data with items and metadata
 */
export async function getNews(category = null) {
  try {
    await initializeDatabase();
    const conn = await getConnection();
    
    // Create query based on category filter
    let query = rethinkdb.table('news');
    
    // Apply category filter if provided
    if (category) {
      query = query.getAll(category, { index: 'category' });
    }
    
    // Sort by date (newest first)
    query = query.orderBy(rethinkdb.desc('publishDate'));
    
    // Execute query
    const cursor = await query.run(conn);
    const items = await cursor.toArray();
    
    // Get categories
    const categoriesCursor = await rethinkdb.table('categories').run(conn);
    const categoriesArray = await categoriesCursor.toArray();
    
    // Convert categories array to object
    /** @type {Object.<string, string>} */
    const categories = {};
    for (const category of categoriesArray) {
      if (category && typeof category === 'object' && 'id' in category && 'name' in category) {
        categories[category.id] = category.name;
      }
    }
    
    return {
      items,
      lastUpdated: new Date().toISOString(),
      categories: Object.keys(categories).length > 0 ? categories : getDefaultCategories()
    };
  } catch (error) {
    console.error('Error getting news from database:', error);
    
    // Fall back to sample data on error if in dev mode
    if (dev && !FORCE_REAL_DATA) {
      // Filter items by category if specified
      const items = category 
        ? sampleNewsData.items.filter(item => item.category === category)
        : sampleNewsData.items;
      
      // Sort items by date (newest first)
      const sortedItems = [...items].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      return {
        items: sortedItems,
        lastUpdated: new Date().toISOString(),
        categories: getDefaultCategories()
      };
    }
    
    // Return empty data with default categories on error
    return {
      items: [],
      lastUpdated: new Date().toISOString(),
      categories: getDefaultCategories()
    };
  }
}

/**
 * Update the news database with new items
 * @param {NewsItem[]} newItems Array of news items to add/update
 * @returns {Promise<Object>} Result information
 */
export async function updateNews(newItems) {
  try {
    await initializeDatabase();
    const conn = await getConnection();
    
    // Get existing items to check for updates
    let addedCount = 0;
    let updatedCount = 0;
    
    // Process items one by one for better control
    for (const item of newItems) {
      // Check if item exists
      const existingItem = await rethinkdb.table('news').get(item.id).run(conn);
      
      if (!existingItem) {
        // This is a new item
        await rethinkdb.table('news').insert(item).run(conn);
        addedCount++;
      } else if (new Date(item.publishDate) > new Date(existingItem.publishDate)) {
        // This is an updated item with a newer publish date
        await rethinkdb.table('news').get(item.id).update(item).run(conn);
        updatedCount++;
      }
    }
    
    // Only log if we have changes
    if (addedCount > 0 || updatedCount > 0) {
      console.log(`Found changes: Added ${addedCount} new items, updated ${updatedCount} existing items`);
    } else {
      console.log('No new items found, database remains unchanged');
    }
    
    // Return the operation result
    return {
      added: addedCount,
      updated: updatedCount,
      total: addedCount + updatedCount
    };
  } catch (error) {
    console.error('Error updating news in database:', error);
    throw error;
  }
}

/**
 * Get available news categories
 * @returns {Promise<Array<{id: string, name: string}>>} Array of category objects with id and name
 */
export async function getCategories() {
  try {
    await initializeDatabase();
    const conn = await getConnection();
    
    // Get categories from database
    const cursor = await rethinkdb.table('categories').run(conn);
    const categories = await cursor.toArray();
    
    // If no categories found, return default
    if (categories.length === 0) {
      return Object.entries(getDefaultCategories()).map(([id, name]) => ({ id, name }));
    }
    
    return categories;
  } catch (error) {
    console.error('Error getting categories from database:', error);
    
    // Return default categories on error
    return Object.entries(getDefaultCategories()).map(([id, name]) => ({ id, name }));
  }
}

/**
 * Limit the number of stored news items to prevent database growth
 * @param {number} maxItems Maximum number of items to keep
 * @returns {Promise<Object>} Pruning result information
 */
export async function pruneNewsItems(maxItems = 100) {
  try {
    await initializeDatabase();
    const conn = await getConnection();
    
    // Count total items
    const totalCount = await rethinkdb.table('news').count().run(conn);
    
    if (totalCount <= maxItems) {
      return { pruned: 0, remaining: totalCount }; // No pruning needed
    }
    
    console.log(`Pruning news items from ${totalCount} to ${maxItems}`);
    
    // Get oldest items to delete
    const itemsToKeep = await rethinkdb.table('news')
      .orderBy(rethinkdb.desc('publishDate'))
      .limit(maxItems)
      .pluck('id')
      .run(conn);
    
    const idsToKeep = (await itemsToKeep.toArray()).map(item => item.id);
    
    // Delete items not in the keep list
    const result = await rethinkdb.table('news')
      .filter(item => rethinkdb.expr(idsToKeep).contains(item('id')).not())
      .delete()
      .run(conn);
    
    console.log(`Pruned ${result.deleted} items, ${maxItems} remain`);
    
    return {
      pruned: result.deleted,
      remaining: maxItems
    };
  } catch (error) {
    console.error('Error pruning news items:', error);
    throw error;
  }
}

/**
 * Close database connection when application shuts down
 */
export async function closeConnection() {
  if (connectionPool) {
    try {
      await connectionPool.close();
      console.log('RethinkDB connection closed');
      connectionPool = null;
    } catch (error) {
      console.error('Error closing RethinkDB connection:', error);
    }
  }
}

// Setup process exit handler to close connection
process.on('SIGTERM', closeConnection);
process.on('SIGINT', closeConnection); 