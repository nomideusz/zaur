/**
 * Initialize the in-memory store
 */
export function initializeStore(): void;
/**
 * Get database connection (mock for compatibility)
 */
export function getConnection(): Promise<{
    mockConnection: boolean;
}>;
/**
 * Close database connection (mock for compatibility)
 */
export function closeConnection(): Promise<boolean>;
/**
 * Get all discovered item IDs
 */
export function getDiscoveredItems(): Promise<any[]>;
/**
 * Get all discovered items with timestamps
 */
export function getDiscoveredItemsWithTimestamps(): Promise<never[]>;
/**
 * Add a new discovered item
 */
export function addDiscoveredItem(itemId: any): Promise<boolean>;
/**
 * Get all comments
 */
export function getComments(): Promise<never[]>;
/**
 * Get comment for a specific item
 */
export function getComment(itemId: any): Promise<any>;
/**
 * Save a comment for an item
 */
export function saveComment(itemId: any, comment: any): Promise<boolean>;
/**
 * Prune older discoveries to prevent memory growth
 */
export function pruneDiscoveries(maxItems?: number): Promise<number>;
/**
 * Get news items (stub for compatibility with RethinkDB version)
 */
export function getNewsItems(): Promise<never[]>;
