import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { fetchAndUpdateNews } from '$lib/server/scripts/updateNews.js';
import { dev } from '$app/environment';

/**
 * GET handler for news update API
 * Only available in development mode or with proper authentication
 */
export async function GET({ request }: RequestEvent) {
  // In production, this would require authentication
  if (!dev) {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !validateAuthHeader(authHeader)) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  
  try {
    // Update the news data
    const result = await fetchAndUpdateNews();
    
    // Return success response
    return json({
      success: true,
      message: result ? `Updated ${result.items.length} news items` : 'News updated',
      timestamp: result?.lastUpdated || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating news:', error);
    
    // Return error response
    return json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Validate authorization header - this is a placeholder
function validateAuthHeader(authHeader: string): boolean {
  // In a real implementation, this would validate a token or API key
  // For now, just a placeholder
  return false;
} 