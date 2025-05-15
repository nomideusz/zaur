import { json } from '@sveltejs/kit';
import { getCategories } from '$lib/server/newsStoreMock.js';

/**
 * GET handler for news categories API
 */
export async function GET() {
  // Get categories data
  const categories = getCategories();
  
  // Return JSON response
  return json(categories);
} 