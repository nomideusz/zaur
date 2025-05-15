import { initializeNewsStore } from '$lib/server/newsStoreInit.js';

/**
 * SvelteKit hook to handle all server requests
 */
export async function handle({ event, resolve }) {
  // News store initialization happens automatically via the imported module
  
  // Standard SvelteKit request handling
  const response = await resolve(event);
  return response;
} 