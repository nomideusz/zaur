import rethinkdb from 'rethinkdb';
export declare const config: {
    host: string;
    port: number;
    db: string;
};
/**
 * Get a connection to the RethinkDB database with retry logic
 */
export declare function getConnection(): Promise<rethinkdb.Connection>;
/**
 * Close the database connection
 */
export declare function closeConnection(): Promise<void>;
/**
 * Get all discovered item IDs
 */
export declare function getDiscoveredItems(): Promise<string[]>;
/**
 * Get all discovered items with timestamps
 */
export declare function getDiscoveredItemsWithTimestamps(): Promise<Array<{
    itemId: string;
    timestamp: string;
}>>;
/**
 * Add a new discovered item
 */
export declare function addDiscoveredItem(itemId: string): Promise<boolean>;
/**
 * Get all comments
 */
export declare function getComments(): Promise<any[]>;
/**
 * Get comment for a specific item
 */
export declare function getComment(itemId: string): Promise<string | null>;
/**
 * Save a comment for an item
 */
export declare function saveComment(itemId: string, comment: string): Promise<boolean>;
/**
 * Get all news items, optionally filtered by category
 */
export declare function getNewsItems(category?: string): Promise<any[]>;
/**
 * Save a news item to the database
 */
export declare function saveNewsItem(item: any): Promise<boolean>;
/**
 * Save multiple news items at once
 */
export declare function saveNewsItems(items: any[]): Promise<number>;
/**
 * Delete news items older than the specified date
 */
export declare function deleteOldNewsItems(olderThan: Date): Promise<number>;
