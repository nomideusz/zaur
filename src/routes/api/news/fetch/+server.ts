import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { fetchNow } from '$lib/server/newsFetchScheduler.js';

/**
 * POST handler to trigger fetching real news
 */
export const POST: RequestHandler = async () => {
  try {
    // Fetch real news using the scheduler's fetchNow function
    const newsCount = await fetchNow();
    
    return json({
      success: true,
      message: `Successfully fetched ${newsCount} real news items`,
      count: newsCount
    });
  } catch (error: any) {
    console.error('Error fetching real news:', error);
    return json({
      success: false,
      message: `Error fetching real news: ${error.message || 'Unknown error'}`,
      error: error.message
    }, { status: 500 });
  }
};

/**
 * GET handler to fetch real news (for browser or client use)
 */
export const GET: RequestHandler = async () => {
  try {
    // Fetch real news using the scheduler's fetchNow function
    const newsCount = await fetchNow();
    
    return json({
      success: true,
      message: `Successfully fetched ${newsCount} real news items`,
      count: newsCount
    });
  } catch (error: any) {
    console.error('Error fetching real news:', error);
    return json({
      success: false,
      message: `Error fetching real news: ${error.message || 'Unknown error'}`,
      error: error.message
    }, { status: 500 });
  }
}; 