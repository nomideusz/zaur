import type { NewsItemWithUI } from '../../state/newsContext.js';
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
export interface DiscoveredItem {
    itemId: string;
    timestamp: string;
}
export type ZaurMood = 'curious' | 'excited' | 'thoughtful' | 'amused' | 'intrigued' | 'surprised';
