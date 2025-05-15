/**
 * Initialize the news fetch scheduler
 */
export function initializeScheduler(): void;
/**
 * Stop the scheduler and cleanup
 */
export function cleanup(): void;
export function fetchNow(): Promise<number>;
