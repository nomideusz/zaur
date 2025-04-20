import type { NewsItem } from '../types/news.js';
import { Context, FiniteStateMachine, StateHistory } from 'runed';
export type NewsState = 'idle' | 'fetching' | 'refreshing' | 'error';
export type NewsEvent = 'fetch' | 'success' | 'error' | 'retry' | 'complete';
export interface NewsItemWithUI extends NewsItem {
    isNew?: boolean;
    isViewed?: boolean;
}
export declare const newsContext: Context<{
    items: NewsItemWithUI[];
    state: NewsState;
    lastRefreshed: Date | null;
    selectedCategory: string | null;
    error: string | null;
}>;
export declare function createNewsMachine(): FiniteStateMachine<NewsState, NewsEvent>;
export declare function createNewsHistory(getItems: () => NewsItemWithUI[], setItems: (items: NewsItemWithUI[]) => void): StateHistory<NewsItemWithUI[]>;
