import type { NewsItem, NewsResponse } from '../types/news.js';
export declare function fetchNewsFromSource(sourceId: string): Promise<NewsItem[]>;
export declare function fetchAllNews(): Promise<NewsResponse>;
export declare function fetchNewsByCategory(category: string): Promise<NewsResponse>;
export declare function getCategoryName(categoryId: string): string;
export declare function getAvailableCategories(): {
    id: string;
    name: string;
}[];
