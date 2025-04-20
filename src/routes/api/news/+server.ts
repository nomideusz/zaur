import { json } from '@sveltejs/kit';
import { getNews } from '$lib/server/newsStore.js';

/**
 * GET handler for news API
 * @param {Object} request The request object
 */
export async function GET({ url }) {
  // Get query parameters
  const category = url.searchParams.get('category');
  
  // Get news data filtered by category
  const newsData = getNews(category);
  
  // Return JSON response
  return json(newsData);
} 