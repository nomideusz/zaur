/**
 * Get a connection to SQLite
 * @returns {Database.Database} SQLite database instance
 */
export function getConnection(): Database.Database;
/**
 * Initialize the database (create tables if they don't exist)
 * @returns {void}
 */
export function initializeDatabase(): void;
/**
 * Read news data from database
 * @returns {NewsData} The news data
 */
export function readNewsData(): NewsData;
/**
 * Get news items, optionally filtered by category
 * @param {string|null} category Optional category filter
 * @returns {Object} News data with items and metadata
 */
export function getNews(category?: string | null): Object;
/**
 * Add or update news items
 * @param {NewsItem[]} items Array of news items to add/update
 * @returns {Object} Result with counts of added and updated items
 */
export function updateNews(items: NewsItem[]): Object;
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
 * Close database connection when application shuts down
 */
export function closeConnection(): void;
export type NewsItem = {
    /**
     * - Unique identifier
     */
    id: string;
    /**
     * - News title
     */
    title: string;
    /**
     * - Summary text
     */
    summary: string;
    /**
     * - URL to the full article
     */
    url: string;
    /**
     * - ISO date string
     */
    publishDate: string;
    /**
     * - Source name
     */
    source: string;
    /**
     * - Source identifier
     */
    sourceId: string;
    /**
     * - Category identifier
     */
    category: string;
    /**
     * - Optional image URL
     */
    imageUrl?: string | undefined;
    /**
     * - Author name
     */
    author: string;
};
export type NewsData = {
    /**
     * - ISO date string of last update
     */
    lastUpdated: string;
    /**
     * - Array of news items
     */
    items: NewsItem[];
    /**
     * - Map of category IDs to names
     */
    categories: {
        [x: string]: string;
    };
    /**
     * - News sources
     */
    sources: Array<{
        id: string;
        name: string;
        url: string;
        category: string;
        priority: number;
    }>;
};
