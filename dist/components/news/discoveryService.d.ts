import type { ZaurNewsItem } from './types.js';
/**
 * Check for time-based discoveries
 * @param allAvailableItems All available news items
 * @param discoveredItemIds Set of discovered item IDs
 * @param showingDiscovery Flag indicating if discovery is currently showing
 * @returns Object with discovery flag and item if a discovery is found
 */
export declare function checkForTimeBasedDiscoveries(allAvailableItems: ZaurNewsItem[], discoveredItemIds: Set<string>, showingDiscovery: boolean): {
    shouldDiscover: boolean;
    seed: number;
};
/**
 * Handle the discovery of a new item
 * @param availableItems Available news items
 * @param currentItems Current displayed news items
 * @param discoveredItemIds Set of discovered item IDs
 * @param seed Seed for deterministic selection
 * @returns Object containing the new item and other info
 */
export declare function discoverNewItem(availableItems: ZaurNewsItem[], currentItems: ZaurNewsItem[], discoveredItemIds: Set<string>, seed: number): Promise<{
    newItem: ZaurNewsItem;
    oldestItemId: string | null;
    discoveredItemId: string;
}>;
