// @ts-nocheck
import { dev } from '$app/environment';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// In-memory store for news data
const inMemoryStore = {
  news: [],
  categories: {},
  sources: []
};

// Default sample data
const sampleNewsData = {
  items: [
    {
      id: 'default-1',
      title: 'Getting Started with Zaur Dashboard',
      summary: 'Learn how to use the Zaur dashboard for navigating between projects and accessing key tools.',
      url: 'https://zaur.app/docs/dashboard',
      publishDate: new Date().toISOString(),
      source: 'Zaur Documentation',
      sourceId: 'zaur',
      category: 'featured',
      imageUrl: 'https://picsum.photos/seed/zaur1/600/400',
      author: 'Zaur Team'
    },
    {
      id: 'default-2',
      title: 'In-Memory Store Implementation',
      summary: 'The in-memory store implementation provides a lightweight alternative to database solutions for local development.',
      url: 'https://zaur.app/news/memory-store',
      publishDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      source: 'Zaur Updates',
      sourceId: 'zaur',
      category: 'dev',
      imageUrl: 'https://picsum.photos/seed/zaur2/600/400',
      author: 'Zaur Development'
    },
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
    }
  ]
};

// Get the directory where the script is executed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the database (load initial data)
 * @returns {void}
 */
export function initializeDatabase() {
  try {
    console.log('Initializing in-memory store...');
    
    // Always load sample data first to ensure we have something to show
    if (inMemoryStore.news.length === 0) {
      inMemoryStore.news = [...sampleNewsData.items];
      console.log(`Loaded ${inMemoryStore.news.length} news items from sample data`);
    }
    
    // If store is empty, load default categories
    if (Object.keys(inMemoryStore.categories).length === 0) {
      const defaultCategories = getDefaultCategories();
      inMemoryStore.categories = { ...defaultCategories };
      
      // If categories exist in sample data, merge them
      if (sampleNewsData.categories) {
        inMemoryStore.categories = { ...inMemoryStore.categories, ...sampleNewsData.categories };
      }
    }
    
    console.log('In-memory store initialization complete');
  } catch (error) {
    console.error('In-memory store initialization failed:', error);
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
    philosophy: "Philosophy",
    featured: "Featured"
  };
}

/**
 * Read news data from in-memory store
 * @returns {Object} The news data
 */
export function readNewsData() {
  try {
    initializeDatabase();
    
    // Return current data
    return {
      lastUpdated: new Date().toISOString(),
      items: inMemoryStore.news,
      categories: Object.keys(inMemoryStore.categories).length > 0 
        ? inMemoryStore.categories 
        : getDefaultCategories(),
      sources: inMemoryStore.sources
    };
  } catch (error) {
    console.error('Error reading news data from in-memory store:', error);
    
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
    
    // Filter items by category if provided
    let items = [...inMemoryStore.news]; // Clone to avoid modifying original
    if (category) {
      items = items.filter(item => item.category === category);
    }
    
    // Sort by publishDate (newest first)
    items.sort((a, b) => {
      const dateA = new Date(a.publishDate);
      const dateB = new Date(b.publishDate);
      return dateB - dateA;
    });
    
    // Always return what we have, even if empty (don't try to fallback to sample data again)
    return {
      items,
      lastUpdated: new Date().toISOString(),
      categories: inMemoryStore.categories
    };
  } catch (error) {
    console.error('Error getting news from in-memory store:', error);
    
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
 * @param {Array} items Array of news items to add/update
 * @returns {Object} Result with counts of added and updated items
 */
export function updateNews(items) {
  try {
    initializeDatabase();
    
    let added = 0;
    let updated = 0;
    
    // Process each item
    for (const item of items) {
      // Find existing item index
      const existingIndex = inMemoryStore.news.findIndex(i => i.id === item.id);
      
      if (existingIndex >= 0) {
        // Update existing item
        inMemoryStore.news[existingIndex] = { ...item };
        updated++;
      } else {
        // Add new item
        inMemoryStore.news.push({ ...item });
        added++;
      }
    }
    
    console.log(`Updated news: ${updated} updated, ${added} added`);
    
    return {
      added,
      updated
    };
  } catch (error) {
    console.error('Error updating news in in-memory store:', error);
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
    
    // If no categories in store, return defaults
    if (Object.keys(inMemoryStore.categories).length === 0) {
      return getDefaultCategories();
    }
    
    return inMemoryStore.categories;
  } catch (error) {
    console.error('Error getting categories from in-memory store:', error);
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
    
    const count = inMemoryStore.news.length;
    
    // If count is less than or equal to maxItems, no pruning needed
    if (count <= maxItems) {
      return 0;
    }
    
    // Sort by date (newest first)
    inMemoryStore.news.sort((a, b) => {
      return new Date(b.publishDate) - new Date(a.publishDate);
    });
    
    // Remove oldest items
    const removed = inMemoryStore.news.splice(maxItems);
    console.log(`Pruned ${removed.length} old news items`);
    
    return removed.length;
  } catch (error) {
    console.error('Error pruning news items from in-memory store:', error);
    return 0;
  }
}

/**
 * Close any open connections (no-op for in-memory store)
 */
export function closeConnection() {
  console.log('In-memory store requires no connection closure');
}

/**
 * Get the connection (for compatibility with SQLite version)
 */
export function getConnection() {
  return { inMemoryStore };
} 