/**
 * Get a connection to PostgreSQL
 * @returns {pg.Pool} PostgreSQL pool instance
 */
export function getConnection(): pg.Pool;
/**
 * Initialize the database (create tables if they don't exist)
 * @returns {Promise<void>}
 */
export function initializeDatabase(): Promise<void>;
/**
 * Read news data from database
 * @returns {Promise<NewsData>} The news data
 */
export function readNewsData(): Promise<NewsData>;
/**
 * Get news items by category
 * @param {string|null} category - Category to filter by (null for all)
 * @returns {Promise<NewsItem[]>} Array of news items
 */
export function getNews(category?: string | null): Promise<NewsItem[]>;
/**
 * Update news items in the database
 * @param {Array<any>} items - Array of news items to update
 * @returns {Promise<{added: number, updated: number}>} Number of updated and added items
 */
export function updateNews(items: Array<any>): Promise<{
    added: number;
    updated: number;
}>;
/**
 * Get all categories from the database
 * @returns {Promise<Object.<string, string>>} Map of category IDs to names
 */
export function getCategories(): Promise<{
    [x: string]: string;
}>;
/**
 * Prune old news items to keep database size manageable
 * @param {number} maxItems - Maximum number of items to keep per category
 * @returns {Promise<number>} Number of deleted items
 */
export function pruneNewsItems(maxItems?: number): Promise<number>;
/**
 * Get comments for a specific news item
 * @param {string} newsId News item ID
 * @returns {Promise<Array>} Comments for the news item
 */
export function getComments(newsId: string): Promise<any[]>;
/**
 * Add a comment to a news item
 * @param {Object} comment Comment object with newsId, author, content
 * @returns {Promise<Object>} Result with success status and the added comment
 */
export function addComment(comment: Object): Promise<Object>;
/**
 * Delete a comment
 * @param {string} commentId Comment ID to delete
 * @returns {Promise<Object>} Result with success status
 */
export function deleteComment(commentId: string): Promise<Object>;
/**
 * Close the database connection
 * @returns {Promise<void>}
 */
export function closeConnection(): Promise<void>;
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
import pg from 'pg';
