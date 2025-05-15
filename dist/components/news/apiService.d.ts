/**
 * Load previously discovered items from server
 * @returns Object containing discovered items, item data with timestamps, and comments
 */
export declare function loadDiscoveredItems(): Promise<{
    items: string[];
    itemsData: {
        itemId: string;
        timestamp: string;
    }[];
    comments: {
        itemId: string;
        comment: string;
    }[];
}>;
/**
 * Save a newly discovered item to the server
 * @param id Item ID
 * @param comment Optional comment
 */
export declare function saveDiscoveredItem(id: string, comment?: string): Promise<boolean>;
/**
 * Save Zaur's comment for an item
 * @param id Item ID
 * @param comment The comment text
 */
export declare function saveZaurComment(id: string, comment: string): Promise<boolean>;
