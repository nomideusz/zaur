export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    publishDate: Date;
    source: string;
    sourceId: string;
    category: string;
    imageUrl?: string;
    author?: string;
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
