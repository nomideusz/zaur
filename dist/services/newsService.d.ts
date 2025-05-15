import type { NewsResponse } from '../types/news.js';
/**
 * Fetch all news from the local API
 * @returns {Promise<NewsResponse>} The news response
 */
export declare function fetchAllNews(): Promise<NewsResponse>;
/**
 * Fetch news by category
 * @param {string} category The category to fetch
 * @returns {Promise<NewsResponse>} The news response
 */
export declare function fetchNewsByCategory(category: string): Promise<NewsResponse>;
/**
 * Get available categories
 * @returns {Array} Array of category objects
 */
export declare function getAvailableCategories(): {
    id: string;
    name: string;
}[];
