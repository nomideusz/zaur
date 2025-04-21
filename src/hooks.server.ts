import { setupScheduledNewsUpdates, fetchAndUpdateNews } from '$lib/server/scripts/updateNews.js';
import { readNewsData } from '$lib/server/newsStore.js';

// Global variable to store the interval timer
let newsUpdateTimer: ReturnType<typeof setInterval> | null = null;

// Track the last scheduler initialization to prevent duplicate timers 
let lastSchedulerInit = 0;

// Flag to force initial update
const FORCE_INITIAL_UPDATE = true;

/**
 * SvelteKit hook to handle all server requests
 */
export async function handle({ event, resolve }) {
  const now = Date.now();

  // Calculate the time since last scheduler initialization 
  const hourInMs = 60 * 60 * 1000;
  const timeSinceLastInit = now - lastSchedulerInit;
  
  // Only start the scheduler if it's not running AND it's been at least an hour
  // since we last initialized it (prevents multiple initializations in dev mode)
  if (!newsUpdateTimer && (timeSinceLastInit > hourInMs || lastSchedulerInit === 0)) {
    console.log('Initializing news update scheduler...');
    lastSchedulerInit = now;
    
    // Check existing data first to avoid unnecessary updates
    const existingData = readNewsData();
    const lastUpdateTime = new Date(existingData.lastUpdated).getTime();
    const timeSinceLastUpdate = now - lastUpdateTime;
    
    // Force update or only update if it's been more than an hour since last update
    if (FORCE_INITIAL_UPDATE || timeSinceLastUpdate > hourInMs) {
      try {
        console.log('Forcing immediate news update...');
        await fetchAndUpdateNews();
        console.log('Immediate news update completed');
      } catch (error) {
        console.error('Error during immediate news update:', error);
      }
    } else {
      console.log(`Skipping initial update - last update was only ${Math.floor(timeSinceLastUpdate / 60000)} minutes ago`);
    }
    
    // Update every 60 minutes (1 hour)
    newsUpdateTimer = setupScheduledNewsUpdates(60);
  }
  
  // Standard SvelteKit request handling
  const response = await resolve(event);
  return response;
} 