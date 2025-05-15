interface NewsSource {
    id: string;
    name: string;
    url: string;
    category: string;
    priority: number;
}
interface NewsItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    publishDate: string;
    source: string;
    sourceId: string;
    category: string;
    imageUrl: string | null;
    author: string;
}
/**
 * Fetch all RSS feeds
 * @param sources The news sources to fetch from
 * @returns Array of news items
 */
export declare function fetchAllRssFeeds(sources: NewsSource[]): Promise<NewsItem[]>;
export {};
