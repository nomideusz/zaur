/**
 * Initialize the database (load initial data)
 * @returns {void}
 */
export function initializeDatabase(): void;
/**
 * Read news data from in-memory store
 * @returns {Object} The news data
 */
export function readNewsData(): Object;
/**
 * Get news items, optionally filtered by category
 * @param {string|null} category Optional category filter
 * @returns {Object} News data with items and metadata
 */
export function getNews(category?: string | null): Object;
/**
 * Add or update news items
 * @param {Array} items Array of news items to add/update
 * @returns {Object} Result with counts of added and updated items
 */
export function updateNews(items: any[]): Object;
/**
 * Get all available categories
 * @returns {Object.<string, string>} Map of category IDs to names
 */
export function getCategories(): {
    [x: string]: string;
};
/**
 * Remove old news items, keeping only the most recent ones
 * @param {number} maxItems Maximum number of items to keep
 * @returns {number} Number of items deleted
 */
export function pruneNewsItems(maxItems?: number): number;
/**
 * Close any open connections (no-op for in-memory store)
 */
export function closeConnection(): void;
/**
 * Get the connection (for compatibility with SQLite version)
 */
export function getConnection(): {
    inMemoryStore: {
        news: never[];
        categories: {};
        sources: never[];
    };
};
