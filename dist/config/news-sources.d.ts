export interface NewsSource {
    id: string;
    name: string;
    url: string;
    type: 'rss' | 'api';
    category: string;
    priority: number;
}
export declare const newsSources: NewsSource[];
export declare const newsCategories: {
    tech: string;
    programming: string;
    products: string;
    design: string;
    business: string;
    science: string;
};
