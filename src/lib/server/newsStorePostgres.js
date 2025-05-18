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

// In-memory sample data for database initialization
const sampleNewsData = {
  items: [
    {
      id: "ai-sample-1",
      title: "Recent Advancements in AI Technology",
      summary: "A look at how artificial intelligence is transforming industries and creating new opportunities.",
      url: "https://example.com/ai-news-1",
      publishDate: "2023-05-15T12:30:00Z",
      source: "Tech Insights",
      sourceId: "tech-insights",
      category: "ai",
      imageUrl: "https://picsum.photos/seed/ai1/600/400",
      author: "Sarah Johnson"
    },
    {
      id: "dev-sample-1",
      title: "The Future of Web Development",
      summary: "Exploring upcoming trends and technologies that will shape web development in the coming years.",
      url: "https://example.com/dev-news-1",
      publishDate: "2023-05-14T10:15:00Z",
      source: "Developer Weekly",
      sourceId: "dev-weekly",
      category: "dev",
      imageUrl: "https://picsum.photos/seed/dev1/600/400",
      author: "Michael Chen"
    },
    {
      id: "crypto-sample-1",
      title: "Understanding Blockchain Applications",
      summary: "A beginner's guide to blockchain technology and its applications beyond cryptocurrency.",
      url: "https://example.com/crypto-news-1",
      publishDate: "2023-05-13T09:45:00Z",
      source: "Crypto Insider",
      sourceId: "crypto-insider",
      category: "crypto",
      imageUrl: "https://picsum.photos/seed/crypto1/600/400",
      author: "Alex Rivera"
    },
    {
      id: "productivity-sample-1",
      title: "Maximizing Productivity in Remote Work",
      summary: "Tips and strategies for staying productive while working remotely.",
      url: "https://example.com/productivity-news-1",
      publishDate: "2023-05-12T14:20:00Z",
      source: "Work Smarter",
      sourceId: "work-smarter",
      category: "productivity",
      imageUrl: "https://picsum.photos/seed/productivity1/600/400",
      author: "Emma Wilson"
    },
    {
      id: "tools-sample-1",
      title: "Essential Developer Tools for 2023",
      summary: "A roundup of the most useful tools and utilities for software developers this year.",
      url: "https://example.com/tools-news-1",
      publishDate: "2023-05-11T11:00:00Z",
      source: "Dev Toolbox",
      sourceId: "dev-toolbox",
      category: "tools",
      imageUrl: "https://picsum.photos/seed/tools1/600/400",
      author: "David Park"
    },
    {
      id: "philosophy-sample-1",
      title: "Ethical Considerations in Technology",
      summary: "Examining the ethical implications of emerging technologies and how they affect society.",
      url: "https://example.com/philosophy-news-1",
      publishDate: "2023-05-10T16:30:00Z",
      source: "Tech Ethics Today",
      sourceId: "tech-ethics",
      category: "philosophy",
      imageUrl: "https://picsum.photos/seed/philosophy1/600/400",
      author: "Priya Sharma"
    }
  ]
};

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
      
      // Create discoveries table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS discoveries (
          id SERIAL PRIMARY KEY,
          item_id TEXT NOT NULL UNIQUE,
          timestamp TEXT NOT NULL
        )
      `);
      
      // Create index for discoveries table
      await client.query(`CREATE INDEX IF NOT EXISTS idx_discoveries_item_id ON discoveries(item_id)`);
      
      // Create zaur_comments table if it doesn't exist (for Zaur's thoughts on news items)
      await client.query(`
        CREATE TABLE IF NOT EXISTS zaur_comments (
          id SERIAL PRIMARY KEY,
          item_id TEXT NOT NULL UNIQUE,
          comment TEXT NOT NULL,
          timestamp TEXT NOT NULL
        )
      `);
      
      // Create index for zaur_comments table
      await client.query(`CREATE INDEX IF NOT EXISTS idx_zaur_comments_item_id ON zaur_comments(item_id)`);
      
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
        // Check if item exists by URL (to avoid duplicates with different IDs)
        const checkResult = await client.query('SELECT id FROM news WHERE url = $1', [item.url]);
        
        if (checkResult.rowCount > 0) {
          // Update existing item
          await client.query(
            `UPDATE news 
             SET title = $1, summary = $2, publish_date = $3, 
                 source = $4, source_id = $5, category = $6, image_url = $7, author = $8
             WHERE id = $9`,
            [
              item.title,
              item.summary,
              item.publishDate,
              item.source,
              item.sourceId,
              item.category,
              item.imageUrl || null,
              item.author,
              checkResult.rows[0].id // Use the existing ID
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

/**
 * Get all discovered item IDs from PostgreSQL
 * @returns {Promise<string[]>} Array of discovered item IDs
 */
export async function getDiscoveredItems() {
  try {
    const pool = getConnection();
    
    const result = await pool.query('SELECT item_id FROM discoveries ORDER BY timestamp DESC');
    
    return result.rows.map(row => row.item_id);
  } catch (error) {
    console.error('Error getting discovered items:', error);
    return [];
  }
}

/**
 * Get all discovered items with timestamps from PostgreSQL
 * @returns {Promise<Array<{itemId: string, timestamp: string}>>} Array of discovered items with timestamps
 */
export async function getDiscoveredItemsWithTimestamps() {
  try {
    const pool = getConnection();
    
    const result = await pool.query('SELECT item_id, timestamp FROM discoveries ORDER BY timestamp DESC');
    
    return result.rows.map(row => ({
      itemId: row.item_id,
      timestamp: row.timestamp
    }));
  } catch (error) {
    console.error('Error getting discovered items with timestamps:', error);
    return [];
  }
}

/**
 * Add a new discovered item to PostgreSQL
 * @param {string} itemId Item ID to add or update
 * @returns {Promise<boolean>} Success indicator
 */
export async function addDiscoveredItem(itemId) {
  try {
    const pool = getConnection();
    const timestamp = new Date().toISOString();
    
    // Check if the item already exists
    const existingResult = await pool.query('SELECT id FROM discoveries WHERE item_id = $1', [itemId]);
    
    if (existingResult.rows.length > 0) {
      // Update timestamp for existing item
      await pool.query('UPDATE discoveries SET timestamp = $1 WHERE item_id = $2', [timestamp, itemId]);
      console.log(`Updated timestamp for existing discovery: ${itemId}`);
    } else {
      // Insert new discovery
      await pool.query('INSERT INTO discoveries (item_id, timestamp) VALUES ($1, $2)', [itemId, timestamp]);
      console.log(`Added new discovery: ${itemId}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error adding/updating discovery for ${itemId}:`, error);
    return false;
  }
}

/**
 * Get Zaur's comments from PostgreSQL
 * @returns {Promise<Array<{itemId: string, comment: string, timestamp: string}>>} Array of comments
 */
export async function getZaurComments() {
  try {
    const pool = getConnection();
    
    const result = await pool.query('SELECT item_id, comment, timestamp FROM zaur_comments');
    
    return result.rows.map(row => ({
      itemId: row.item_id,
      comment: row.comment,
      timestamp: row.timestamp
    }));
  } catch (error) {
    console.error('Error getting Zaur comments:', error);
    return [];
  }
}

/**
 * Get a specific Zaur comment from PostgreSQL
 * @param {string} itemId The item ID to get the comment for
 * @returns {Promise<string|null>} The comment or null
 */
export async function getZaurComment(itemId) {
  try {
    const pool = getConnection();
    
    const result = await pool.query('SELECT comment FROM zaur_comments WHERE item_id = $1', [itemId]);
    
    if (result.rows.length > 0) {
      return result.rows[0].comment;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting Zaur comment for ${itemId}:`, error);
    return null;
  }
}

/**
 * Save a Zaur comment to PostgreSQL
 * @param {string} itemId Item ID to add comment for
 * @param {string} comment The comment text
 * @returns {Promise<boolean>} Success indicator
 */
export async function saveZaurComment(itemId, comment) {
  try {
    const pool = getConnection();
    const timestamp = new Date().toISOString();
    
    // Check if a comment already exists for this item
    const existingResult = await pool.query('SELECT id FROM zaur_comments WHERE item_id = $1', [itemId]);
    
    if (existingResult.rows.length > 0) {
      // Update existing comment
      await pool.query(
        'UPDATE zaur_comments SET comment = $1, timestamp = $2 WHERE item_id = $3',
        [comment, timestamp, itemId]
      );
      console.log(`Updated Zaur comment for item ${itemId}`);
    } else {
      // Insert new comment
      await pool.query(
        'INSERT INTO zaur_comments (item_id, comment, timestamp) VALUES ($1, $2, $3)',
        [itemId, comment, timestamp]
      );
      console.log(`Added new Zaur comment for item ${itemId}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error saving Zaur comment for ${itemId}:`, error);
    return false;
  }
}

/**
 * Prune older discoveries to prevent database growth
 * @param {number} maxItems Maximum number of items to keep
 * @returns {Promise<number>} Number of items deleted
 */
export async function pruneDiscoveries(maxItems = 1000) {
  try {
    const pool = getConnection();
    
    // First count all discoveries
    const countResult = await pool.query('SELECT COUNT(*) FROM discoveries');
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    if (totalCount <= maxItems) {
      console.log(`No pruning needed, only have ${totalCount} discoveries (max: ${maxItems})`);
      return 0;
    }
    
    // Get the IDs of the most recent maxItems discoveries
    const recentResult = await pool.query(
      'SELECT item_id FROM discoveries ORDER BY timestamp DESC LIMIT $1',
      [maxItems]
    );
    
    const recentIds = recentResult.rows.map(row => row.item_id);
    
    // Now delete all entries that aren't in the recentIds list
    const deleteResult = await pool.query(
      'DELETE FROM discoveries WHERE item_id NOT IN (SELECT unnest($1::text[]))',
      [recentIds]
    );
    
    console.log(`Pruned ${deleteResult.rowCount} older discoveries, keeping ${maxItems}`);
    return deleteResult.rowCount;
  } catch (error) {
    console.error('Error pruning discoveries:', error);
    return 0;
  }
} 