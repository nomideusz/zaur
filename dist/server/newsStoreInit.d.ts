/**
 * Initialize the news data store
 * @returns {void}
 */
export function initializeNewsStore(): void;
export function readNewsData(): Object;
export function getCategories(): {
    [x: string]: string;
};
export function getActiveStoreType(): "sqlite" | "mock";
