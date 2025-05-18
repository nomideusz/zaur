/**
 * Fetch all RSS feeds and update the news database
 */
export declare function fetchAllRssFeeds(): Promise<{
    added: number;
    updated: number;
    total: number;
}>;
