import type { ZaurNewsItem } from './types.js';
/**
 * Process all news items for later use
 * @param items Raw news items from API
 * @param zaurComments Map of previously saved comments
 * @returns Processed news items with Zaur's comments and UI properties
 */
export declare function processNewsItems(items: any[], zaurComments: Map<string, string>): ZaurNewsItem[];
/**
 * Mark items as discovered in the available items array
 * @param allAvailableItems All available news items
 * @param discoveredItemIds Set of discovered item IDs
 * @param zaurComments Map of Zaur's comments
 * @param lastDiscoveredItems Array of discovered items with timestamps
 * @returns Array of marked items and updated seenItemIds set
 */
export declare function markDiscoveredItems(allAvailableItems: ZaurNewsItem[], discoveredItemIds: Set<string>, zaurComments: Map<string, string>, lastDiscoveredItems: {
    itemId: string;
    timestamp: string;
}[]): {
    updatedItems: ZaurNewsItem[];
    seenItemIds: Set<string>;
};
/**
 * Sort items with discoveries at the top
 * @param items News items to sort
 * @param lastDiscoveredItems Array of discovered items with timestamps
 * @returns Sorted array of news items
 */
export declare function sortWithDiscoveriesAtTop(items: ZaurNewsItem[], lastDiscoveredItems: {
    itemId: string;
    timestamp: string;
}[]): ZaurNewsItem[];
