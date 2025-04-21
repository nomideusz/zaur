import { initializeRethinkDb } from '$lib/server/rethinkDbInit.js';

/**
 * SvelteKit hook to handle all server requests
 */
export async function handle({ event, resolve }) {
  // RethinkDB initialization happens automatically via the imported module
  
  // Standard SvelteKit request handling
  const response = await resolve(event);
  return response;
} 