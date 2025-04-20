import { setupScheduledNewsUpdates, fetchAndUpdateNews } from '$lib/server/scripts/updateNews.js';

// Global variable to store the interval timer
let newsUpdateTimer: ReturnType<typeof setInterval> | null = null;

/**
 * SvelteKit hook to handle all server requests
 */
export async function handle({ event, resolve }) {
  // Start the news update scheduler if it's not already running
  if (!newsUpdateTimer) {
    console.log('Initializing news update scheduler...');
    
    // Immediately fetch the latest news
    try {
      console.log('Forcing immediate news update...');
      await fetchAndUpdateNews();
      console.log('Immediate news update completed');
    } catch (error) {
      console.error('Error during immediate news update:', error);
    }
    
    // Update every 60 minutes (1 hour)
    newsUpdateTimer = setupScheduledNewsUpdates(60);
  }
  
  // Standard SvelteKit request handling
  const response = await resolve(event);
  return response;
} 