import type { NewsItemWithUI } from '../state/newsContext.js';
export declare function animateNewItems(items: Element[], options?: {
    duration?: number;
    staggerDelay?: number;
    startDelay?: number;
}): void;
export declare function highlightItems(items: NewsItemWithUI[], condition: (item: NewsItemWithUI) => boolean, classToApply?: string): void;
