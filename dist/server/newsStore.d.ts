/**
 * Initialize the database (create if not exists)
 * @returns {Promise<void>}
 */
export function initializeDatabase(): Promise<void>;
/**
 * Read news data from database
 * @returns {Promise<NewsData>} The news data
 */
export function readNewsData(): Promise<NewsData>;
/**
 * Get news items, optionally filtered by category
 * @param {string|null} category Optional category filter
 * @returns {Promise<Object>} News data with items and metadata
 */
export function getNews(category?: string | null): Promise<Object>;
/**
 * Update the news database with new items
 * @param {NewsItem[]} newItems Array of news items to add/update
 * @returns {Promise<Object>} Result information
 */
export function updateNews(newItems: NewsItem[]): Promise<Object>;
/**
 * Get available news categories
 * @returns {Promise<Array<{id: string, name: string}>>} Array of category objects with id and name
 */
export function getCategories(): Promise<Array<{
    id: string;
    name: string;
}>>;
/**
 * Limit the number of stored news items to prevent database growth
 * @param {number} maxItems Maximum number of items to keep
 * @returns {Promise<Object>} Pruning result information
 */
export function pruneNewsItems(maxItems?: number): Promise<Object>;
/**
 * Close database connection when application shuts down
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
