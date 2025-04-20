import type { NewsItem } from '$lib/types/news.js';
import { Context, FiniteStateMachine, StateHistory } from 'runed';

// Define types for our state machine and context
export type NewsState = 'idle' | 'fetching' | 'refreshing' | 'error';
export type NewsEvent = 'fetch' | 'success' | 'error' | 'retry' | 'complete';

// Extended version of NewsItem that includes UI state
export interface NewsItemWithUI extends NewsItem {
  isNew?: boolean;
  isViewed?: boolean;
}

// Context for sharing news state across components
export const newsContext = new Context<{
  items: NewsItemWithUI[];
  state: NewsState;
  lastRefreshed: Date | null;
  selectedCategory: string | null;
  error: string | null;
}>("newsContext");

// Create a finite state machine for managing news loading states
export function createNewsMachine() {
  return new FiniteStateMachine<NewsState, NewsEvent>("idle", {
    idle: {
      fetch: "fetching",
      _enter: () => {
        console.log("News panel is idle and ready");
      }
    },
    fetching: {
      success: "refreshing",
      error: "error",
      _enter: () => {
        console.log("Fetching news...");
      }
    },
    refreshing: {
      complete: "idle",
      error: "error",
      _enter: () => {
        console.log("Refreshing news display...");
      }
    },
    error: {
      retry: "fetching",
      _enter: () => {
        console.log("Error loading news");
      }
    }
  });
}

// Create a history tracker for undo/redo functionality
export function createNewsHistory(
  getItems: () => NewsItemWithUI[],
  setItems: (items: NewsItemWithUI[]) => void
) {
  return new StateHistory(getItems, setItems);
} 