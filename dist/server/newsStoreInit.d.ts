/**
 * Initialize the news data store
 * @returns {Promise<void>}
 */
export function initializeNewsStore(): Promise<void>;
export function readNewsData(): Promise<Object>;
export function getCategories(): Promise<{
    [x: string]: string;
}>;
/**
 * Update news items in the database
 * @param {Array<any>} items Array of news items to add or update
 * @returns {Promise<{added: number, updated: number}>} Result with counts of added and updated items
 */
export function updateNews(items: Array<any>): Promise<{
    added: number;
    updated: number;
}>;
export function pruneNewsItems(maxItems?: number): Promise<number>;
export function getNews(category?: null): Promise<Object>;
/**
 * Get comments for a specific news item
 * @param {string} newsId News item ID
 * @returns {Promise<Array<any>>} Comments for the news item
 */
export function getComments(newsId: string): Promise<Array<any>>;
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
export function getActiveStoreType(): string;
