// @ts-nocheck
import { dev } from '$app/environment';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

// Get the directory where the script is executed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite configuration
const DB_CONFIG = {
  path: process.env.SQLITE_DB_PATH || path.join(__dirname, '../../..', 'data', 'zaur_news.db')
};

// Ensure the data directory exists
const dataDir = path.dirname(DB_CONFIG.path);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database connection - will be initialized on first use
let db = null;

/**
 * Get a connection to SQLite
 * @returns {Database.Database} SQLite database instance
 */
export function getConnection() {
  if (!db) {
    try {
      console.log(`Connecting to SQLite at ${DB_CONFIG.path}...`);
      db = new Database(DB_CONFIG.path);
      console.log('Successfully connected to SQLite');
    } catch (error) {
      console.error('Error connecting to SQLite:', error);
      throw error;
    }
  }
  
  return db;
}

/**
 * Initialize the database (create tables if they don't exist)
 * @returns {void}
 */
export function initializeDatabase() {
  try {
    const db = getConnection();
    
    // Create news table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT,
        publishDate TEXT,
        source TEXT,
        sourceId TEXT,
        category TEXT,
        imageUrl TEXT,
        author TEXT
      )
    `);
    
    // Create indexes for news table
    db.exec(`CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_news_sourceId ON news(sourceId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_news_publishDate ON news(publishDate)`);
    
    // Create sources table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT,
        category TEXT,
        priority INTEGER DEFAULT 0
      )
    `);
    
    // Create index for sources table
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sources_category ON sources(category)`);
    
    // Create categories table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
    
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
 * @returns {NewsData} The news data
 */
export function readNewsData() {
  try {
    initializeDatabase();
    const db = getConnection();
    
    // Get news items
    const items = db.prepare('SELECT * FROM news').all();
    
    // Get categories
    const categoriesRows = db.prepare('SELECT * FROM categories').all();
    
    // Convert categories array to object
    /** @type {Object.<string, string>} */
    const categories = {};
    for (const category of categoriesRows) {
      categories[category.id] = category.name;
    }
    
    // Get sources
    const sources = db.prepare('SELECT * FROM sources').all();
    
    // If there are no items, use sample data in dev mode
    if (items.length === 0) {
      console.log('No items found in database, using sample data');
      
      // Load default categories if needed
      if (Object.keys(categories).length === 0) {
        const defaultCategories = getDefaultCategories();
        
        // Convert to array for insertion
        const categoriesToInsert = Object.entries(defaultCategories).map(([id, name]) => ({ id, name }));
        
        // Insert categories
        const insertCategory = db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)');
        const insertCategories = db.transaction((categories) => {
          for (const category of categories) {
            insertCategory.run(category.id, category.name);
          }
        });
        
        insertCategories(categoriesToInsert);
        
        // Update categories object for return
        Object.assign(categories, defaultCategories);
      }
      
      // Use sample data in dev mode
      if (dev && !FORCE_REAL_DATA) {
        try {
          // Insert sample data
          const insertNews = db.prepare(`
            INSERT INTO news (id, title, summary, url, publishDate, source, sourceId, category, imageUrl, author)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const insertNewsItems = db.transaction((items) => {
            for (const item of items) {
              insertNews.run(
                item.id,
                item.title,
                item.summary,
                item.url,
                item.publishDate,
                item.source,
                item.sourceId,
                item.category,
                item.imageUrl || null,
                item.author
              );
            }
          });
          
          insertNewsItems(sampleNewsData.items);
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
 * @returns {Object} News data with items and metadata
 */
export function getNews(category = null) {
  try {
    initializeDatabase();
    const db = getConnection();
    
    // Create query based on category filter
    let items;
    if (category) {
      items = db.prepare('SELECT * FROM news WHERE category = ? ORDER BY publishDate DESC').all(category);
    } else {
      items = db.prepare('SELECT * FROM news ORDER BY publishDate DESC').all();
    }
    
    // Get categories
    const categoriesRows = db.prepare('SELECT * FROM categories').all();
    
    // Convert categories array to object
    /** @type {Object.<string, string>} */
    const categories = {};
    for (const category of categoriesRows) {
      categories[category.id] = category.name;
    }
    
    // If no categories found, use defaults
    const finalCategories = Object.keys(categories).length > 0 ? categories : getDefaultCategories();
    
    // Use sample data if no items and in dev mode
    if (items.length === 0 && dev && !FORCE_REAL_DATA) {
      let sampleItems = sampleNewsData.items;
      
      // Filter by category if provided
      if (category) {
        sampleItems = sampleItems.filter(item => item.category === category);
      }
      
      return {
        items: sampleItems,
        lastUpdated: new Date().toISOString(),
        categories: finalCategories
      };
    }
    
    return {
      items,
      lastUpdated: new Date().toISOString(),
      categories: finalCategories
    };
  } catch (error) {
    console.error('Error getting news from database:', error);
    
    // Return empty data on error
    return {
      items: [],
      lastUpdated: new Date().toISOString(),
      categories: getDefaultCategories()
    };
  }
}

/**
 * Add or update news items
 * @param {NewsItem[]} items Array of news items to add/update
 * @returns {Object} Result with counts of added and updated items
 */
export function updateNews(items) {
  try {
    initializeDatabase();
    const db = getConnection();
    
    const insertStmt = db.prepare(`
      INSERT INTO news (id, title, summary, url, publishDate, source, sourceId, category, imageUrl, author)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        url = excluded.url,
        publishDate = excluded.publishDate,
        source = excluded.source,
        sourceId = excluded.sourceId,
        category = excluded.category,
        imageUrl = excluded.imageUrl,
        author = excluded.author
    `);
    
    // Track added vs updated
    let added = 0;
    let updated = 0;
    
    // Use a transaction for better performance with multiple inserts
    const updateNewsItems = db.transaction((items) => {
      for (const item of items) {
        // Check if item exists to determine if it's an add or update
        const exists = db.prepare('SELECT 1 FROM news WHERE id = ?').get(item.id);
        
        insertStmt.run(
          item.id,
          item.title,
          item.summary,
          item.url,
          item.publishDate,
          item.source,
          item.sourceId,
          item.category,
          item.imageUrl || null,
          item.author
        );
        
        if (exists) {
          updated++;
        } else {
          added++;
        }
      }
    });
    
    updateNewsItems(items);
    
    console.log(`Updated news: ${updated} updated, ${added} added`);
    
    return {
      added,
      updated
    };
  } catch (error) {
    console.error('Error updating news in database:', error);
    throw error;
  }
}

/**
 * Get all available categories
 * @returns {Object.<string, string>} Map of category IDs to names
 */
export function getCategories() {
  try {
    initializeDatabase();
    const db = getConnection();
    
    // Get categories from database
    const categoriesRows = db.prepare('SELECT * FROM categories').all();
    
    // Convert to object format
    const categories = {};
    for (const row of categoriesRows) {
      categories[row.id] = row.name;
    }
    
    // If no categories in DB, return defaults
    if (Object.keys(categories).length === 0) {
      return getDefaultCategories();
    }
    
    return categories;
  } catch (error) {
    console.error('Error getting categories from database:', error);
    return getDefaultCategories();
  }
}

/**
 * Remove old news items, keeping only the most recent ones
 * @param {number} maxItems Maximum number of items to keep
 * @returns {number} Number of items deleted
 */
export function pruneNewsItems(maxItems = 100) {
  try {
    initializeDatabase();
    const db = getConnection();
    
    // Get the total count
    const count = db.prepare('SELECT COUNT(*) as count FROM news').get().count;
    
    // If count is less than or equal to maxItems, no pruning needed
    if (count <= maxItems) {
      return 0;
    }
    
    // Calculate how many to delete
    const deleteCount = count - maxItems;
    
    // Delete the oldest items
    const result = db.prepare(`
      DELETE FROM news 
      WHERE id IN (
        SELECT id FROM news 
        ORDER BY publishDate ASC 
        LIMIT ?
      )
    `).run(deleteCount);
    
    console.log(`Pruned ${result.changes} old news items`);
    return result.changes;
  } catch (error) {
    console.error('Error pruning news items:', error);
    return 0;
  }
}

/**
 * Close database connection when application shuts down
 */
export function closeConnection() {
  if (db) {
    try {
      db.close();
      console.log('SQLite connection closed');
      db = null;
    } catch (error) {
      console.error('Error closing SQLite connection:', error);
    }
  }
} 