import type { NewsItemWithUI } from '$lib/state/newsContext.js';

// Extended NewsItem with Zaur UI elements
export interface ZaurNewsItem extends NewsItemWithUI {
  zaurComment?: string | null;
  justDiscovered?: boolean;
  discoveryComment?: string;
  isRemoving?: boolean;
  decodedTitle?: string;
  decodedSummary?: string;
  zaurMood?: string;
  isEmphasized?: boolean;
  hasReacted?: boolean;
}

// Type for discovered items with timestamps
export interface DiscoveredItem {
  itemId: string;
  timestamp: string;
}

// Type for Zaur's moods
export type ZaurMood = 'curious' | 'excited' | 'thoughtful' | 'amused' | 'intrigued' | 'surprised'; 