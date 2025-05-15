export interface RssItem {
    title: string;
    description: string;
    link: string;
    pubDate: string;
    guid: string;
    creator: string;
    enclosure: string;
}
export interface NewsSource {
    id: string;
    name: string;
    url: string;
    category: string;
    priority: number;
}
export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    publishDate: string;
    source: string;
    sourceId: string;
    category: string;
    imageUrl?: string | null;
    author: string;
}
export interface NewsResponse {
    items: NewsItem[];
    lastUpdated: Date;
    isMock?: boolean;
}
export interface NewsState {
    items: NewsItem[];
    isOpen: boolean;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}
