/**
 * Fetch all RSS feeds and update the news database
 */
export declare function fetchAllRssFeeds(): Promise<Object | {
    added: number;
    updated: number;
    total: number;
}>;
