// @ts-nocheck
// import { dev } from '$app/environment';
const dev = process.env.NODE_ENV !== 'production';
import pg from 'pg';
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
// Get the directory where the script is executed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load sample data using fs
const sampleDataPath = path.join(__dirname, 'data/sample-news.json');
let sampleNewsData;
try {
  sampleNewsData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
} catch (error) {
  console.error('Error loading sample news data:', error);
  sampleNewsData = { items: [] };
}

// PostgreSQL configuration
const DB_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'zaur_news',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
};

// Database connection - will be initialized on first use
let client = null;
let pool = null;

/**
 * Get a connection to PostgreSQL
 * @returns {pg.Pool} PostgreSQL pool instance
 */
export function getConnection() {
  if (!pool) {
    try {
      console.log(`Connecting to PostgreSQL at ${DB_CONFIG.host}:${DB_CONFIG.port}...`);
      
      // Connect directly to the target database
      pool = new pg.Pool({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        database: DB_CONFIG.database,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password
      });
      
      console.log('Successfully connected to PostgreSQL');
    } catch (error) {
      console.error('Error connecting to PostgreSQL:', error);
      throw error;
    }
  }
  
  return pool;
}

/**
 * Try to create database if it doesn't exist
 * @returns {Promise<void>}
 */
async function ensureDatabaseExists() {
  // Create a temporary connection to postgres database
  const tempPool = new pg.Pool({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    database: 'postgres', // Connect to default database
    user: DB_CONFIG.user,
    password: DB_CONFIG.password
  });
  
  try {
    // Check if database exists
    const result = await tempPool.query(`
      SELECT 1 FROM pg_database WHERE datname = '${DB_CONFIG.database}'
    `);
    
    // Create database if it doesn't exist
    if (result.rows.length === 0) {
      console.log(`Database '${DB_CONFIG.database}' does not exist, creating...`);
      await tempPool.query(`CREATE DATABASE ${DB_CONFIG.database}`);
      console.log(`Database '${DB_CONFIG.database}' created successfully`);
    } else {
      console.log(`Database '${DB_CONFIG.database}' already exists`);
    }
  } catch (error) {
    console.error('Error checking/creating database:', error);
    throw error;
  } finally {
    await tempPool.end();
  }
}

/**
 * Initialize the database (create tables if they don't exist)
 * @returns {Promise<void>}
 */
export async function initializeDatabase() {
  try {
    // First try to ensure database exists
    try {
      await ensureDatabaseExists();
    } catch (error) {
      console.warn('Could not create database, will try to connect anyway:', error.message);
    }
    
    const pool = getConnection();
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Create news table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS news (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          summary TEXT,
          url TEXT,
          publish_date TEXT,
          source TEXT,
          source_id TEXT,
          category TEXT,
          image_url TEXT,
          author TEXT
        )
      `);
      
      // Create indexes for news table
      await client.query(`CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_news_source_id ON news(source_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_news_publish_date ON news(publish_date)`);
      
      // Create sources table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS sources (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT,
          category TEXT,
          priority INTEGER DEFAULT 0
        )
      `);
      
      // Create index for sources table
      await client.query(`CREATE INDEX IF NOT EXISTS idx_sources_category ON sources(category)`);
      
      // Create categories table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        )
      `);
      
      // Create comments table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          news_id TEXT NOT NULL,
          author TEXT,
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
        )
      `);
      
      // Create index for comments table
      await client.query(`CREATE INDEX IF NOT EXISTS idx_comments_news_id ON comments(news_id)`);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('Database initialization complete');
      
      // Check if we have any news data already
      const newsCount = await pool.query('SELECT COUNT(*) FROM news');
      if (newsCount.rows[0].count === '0') {
        console.log('No news items found in database, populating with sample data');
        
        // Insert default categories
        const defaultCategories = getDefaultCategories();
        const categoriesToInsert = Object.entries(defaultCategories).map(([id, name]) => ({ id, name }));
        
        for (const category of categoriesToInsert) {
          await pool.query(
            'INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
            [category.id, category.name]
          );
        }
        
        // Insert sample news items
        if (sampleNewsData && sampleNewsData.items && sampleNewsData.items.length > 0) {
          console.log(`Inserting ${sampleNewsData.items.length} sample news items into database`);
          for (const item of sampleNewsData.items) {
            await pool.query(
              `INSERT INTO news (id, title, summary, url, publish_date, source, source_id, category, image_url, author)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
              [
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
              ]
            );
          }
          console.log('Sample data inserted successfully');
        } else {
          console.warn('No sample data available to populate database');
        }
      } else {
        console.log(`Database already contains ${newsCount.rows[0].count} news items`);
      }
      
    } catch (error) {
      // Roll back transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release client back to pool
      client.release();
    }
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
    const pool = getConnection();
    
    // Get news items
    const newsResult = await pool.query('SELECT * FROM news');
    const items = newsResult.rows;
    
    // Transform column names to camelCase
    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      url: item.url,
      publishDate: item.publish_date,
      source: item.source,
      sourceId: item.source_id,
      category: item.category,
      imageUrl: item.image_url,
      author: item.author
    }));
    
    // Get categories
    const categoriesResult = await pool.query('SELECT * FROM categories');
    const categoriesRows = categoriesResult.rows;
    
    // Convert categories array to object
    /** @type {Object.<string, string>} */
    const categories = {};
    for (const category of categoriesRows) {
      categories[category.id] = category.name;
    }
    
    // Get sources
    const sourcesResult = await pool.query('SELECT * FROM sources');
    const sources = sourcesResult.rows;
    
    // If there are no items, use sample data in dev mode
    if (items.length === 0) {
      console.log('No items found in database, using sample data');
      
      // Load default categories if needed
      if (Object.keys(categories).length === 0) {
        const defaultCategories = getDefaultCategories();
        
        // Convert to array for insertion
        const categoriesToInsert = Object.entries(defaultCategories).map(([id, name]) => ({ id, name }));
        
        // Insert categories
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          for (const category of categoriesToInsert) {
            await client.query(
              'INSERT INTO categories (id, name) VALUES ($1, $2)',
              [category.id, category.name]
            );
          }
          
          await client.query('COMMIT');
          
          // Update categories object for return
          Object.assign(categories, defaultCategories);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
      
      // Use sample data in dev mode
      if (dev && !FORCE_REAL_DATA) {
        try {
          // Insert sample data
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            for (const item of sampleNewsData.items) {
              await client.query(
                `INSERT INTO news (id, title, summary, url, publish_date, source, source_id, category, image_url, author)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
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
                ]
              );
            }
            
            await client.query('COMMIT');
            console.log(`Inserted ${sampleNewsData.items.length} sample news items`);
            
            // Return with sample data
            return {
              lastUpdated: new Date().toISOString(),
              items: sampleNewsData.items,
              categories,
              sources
            };
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        } catch (sampleError) {
          console.error('Error inserting sample data:', sampleError);
        }
      }
    }
    
    return {
      lastUpdated: new Date().toISOString(),
      items: transformedItems,
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
 * Get news items by category
 * @param {string|null} category - Category to filter by (null for all)
 * @returns {Promise<NewsItem[]>} Array of news items
 */
export async function getNews(category = null) {
  try {
    const pool = getConnection();
    let query = 'SELECT * FROM news';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY publish_date DESC';
    
    const result = await pool.query(query, params);
    
    // Transform column names to camelCase
    return result.rows.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      url: item.url,
      publishDate: item.publish_date,
      source: item.source,
      sourceId: item.source_id,
      category: item.category,
      imageUrl: item.image_url,
      author: item.author
    }));
  } catch (error) {
    console.error('Error getting news items:', error);
    return [];
  }
}

/**
 * Update news items in the database
 * @param {Array<any>} items - Array of news items to update
 * @returns {Promise<{added: number, updated: number}>} Number of updated and added items
 */
export async function updateNews(items) {
  try {
    if (!items || items.length === 0) {
      console.log('No items to update');
      return { updated: 0, added: 0 };
    }
    
    const pool = getConnection();
    const client = await pool.connect();
    
    let updated = 0;
    let added = 0;
    
    try {
      await client.query('BEGIN');
      
      for (const item of items) {
        // Check if item exists
        const checkResult = await client.query('SELECT id FROM news WHERE id = $1', [item.id]);
        
        if (checkResult.rowCount > 0) {
          // Update existing item
          await client.query(
            `UPDATE news 
             SET title = $1, summary = $2, url = $3, publish_date = $4, 
                 source = $5, source_id = $6, category = $7, image_url = $8, author = $9
             WHERE id = $10`,
            [
              item.title,
              item.summary,
              item.url,
              item.publishDate,
              item.source,
              item.sourceId,
              item.category,
              item.imageUrl || null,
              item.author,
              item.id
            ]
          );
          updated++;
        } else {
          // Insert new item
          await client.query(
            `INSERT INTO news (id, title, summary, url, publish_date, source, source_id, category, image_url, author)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
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
            ]
          );
          added++;
        }
      }
      
      await client.query('COMMIT');
      console.log(`Updated news: ${updated} updated, ${added} added`);
      
      return { updated, added };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating news items:', error);
    return { updated: 0, added: 0 };
  }
}

/**
 * Get all categories from the database
 * @returns {Promise<Object.<string, string>>} Map of category IDs to names
 */
export async function getCategories() {
  try {
    await initializeDatabase();
    const pool = getConnection();
    
    const result = await pool.query('SELECT * FROM categories');
    
    if (result.rows.length === 0) {
      return getDefaultCategories();
    }
    
    const categories = {};
    for (const category of result.rows) {
      categories[category.id] = category.name;
    }
    
    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    return getDefaultCategories();
  }
}

/**
 * Prune old news items to keep database size manageable
 * @param {number} maxItems - Maximum number of items to keep per category
 * @returns {Promise<number>} Number of deleted items
 */
export async function pruneNewsItems(maxItems = 100) {
  try {
    const pool = getConnection();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get all categories
      const categoriesResult = await client.query('SELECT DISTINCT category FROM news');
      const categories = categoriesResult.rows.map(row => row.category);
      
      let totalDeleted = 0;
      
      for (const category of categories) {
        // Get the oldest items to keep for each category
        const oldestToKeepResult = await client.query(
          'SELECT publish_date FROM news WHERE category = $1 ORDER BY publish_date DESC OFFSET $2 LIMIT 1',
          [category, maxItems]
        );
        
        if (oldestToKeepResult.rows.length > 0) {
          const oldestToKeep = oldestToKeepResult.rows[0].publish_date;
          
          // Delete older items
          const deleteResult = await client.query(
            'DELETE FROM news WHERE category = $1 AND publish_date < $2',
            [category, oldestToKeep]
          );
          
          totalDeleted += deleteResult.rowCount;
        }
      }
      
      await client.query('COMMIT');
      
      if (totalDeleted > 0) {
        console.log(`Pruned ${totalDeleted} old news items`);
      }
      
      return totalDeleted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error pruning news items:', error);
    return 0;
  }
}

/**
 * Get comments for a specific news item
 * @param {string} newsId News item ID
 * @returns {Promise<Array>} Comments for the news item
 */
export async function getComments(newsId) {
  try {
    const pool = getConnection();
    
    const result = await pool.query(
      'SELECT * FROM comments WHERE news_id = $1 ORDER BY timestamp DESC',
      [newsId]
    );
    
    // Transform column names to camelCase
    return result.rows.map(comment => ({
      id: comment.id,
      newsId: comment.news_id,
      author: comment.author,
      content: comment.content,
      timestamp: comment.timestamp
    }));
  } catch (error) {
    console.error(`Error getting comments for news item ${newsId}:`, error);
    return [];
  }
}

/**
 * Add a comment to a news item
 * @param {Object} comment Comment object with newsId, author, content
 * @returns {Promise<Object>} Result with success status and the added comment
 */
export async function addComment(comment) {
  try {
    if (!comment || !comment.newsId || !comment.content) {
      throw new Error('Invalid comment data');
    }
    
    const pool = getConnection();
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Check if the news item exists
    const newsCheck = await pool.query('SELECT id FROM news WHERE id = $1', [comment.newsId]);
    if (newsCheck.rows.length === 0) {
      throw new Error(`News item with ID ${comment.newsId} not found`);
    }
    
    // Insert the comment
    await pool.query(
      'INSERT INTO comments (id, news_id, author, content, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [commentId, comment.newsId, comment.author || 'Anonymous', comment.content, timestamp]
    );
    
    return {
      success: true,
      comment: {
        id: commentId,
        newsId: comment.newsId,
        author: comment.author || 'Anonymous',
        content: comment.content,
        timestamp
      }
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a comment
 * @param {string} commentId Comment ID to delete
 * @returns {Promise<Object>} Result with success status
 */
export async function deleteComment(commentId) {
  try {
    const pool = getConnection();
    
    const result = await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    
    return {
      success: true,
      deleted: result.rowCount > 0
    };
  } catch (error) {
    console.error(`Error deleting comment ${commentId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
export async function closeConnection() {
  if (pool) {
    try {
      await pool.end();
      console.log('PostgreSQL connection closed');
      pool = null;
    } catch (error) {
      console.error('Error closing PostgreSQL connection:', error);
    }
  }
} 