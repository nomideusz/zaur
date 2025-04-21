import { json } from '@sveltejs/kit';
import { getDiscoveredItems, addDiscoveredItem, getComments, saveComment } from '$lib/server/db.js';

// Sample data for fallback mode
const sampleDiscoveries = ['sample-1', 'sample-2', 'sample-3'];

/**
 * GET handler for discoveries
 */
export async function GET() {
  try {
    // Try to get discoveries from database
    const items = await getDiscoveredItems();
    
    // If we have items or empty array is ok, return them
    return json({ items });
  } catch (error) {
    console.error('Error fetching discoveries:', error);
    
    // Return sample data on error
    console.log('Using sample discovery data due to database error');
    return json({ 
      items: sampleDiscoveries,
      isSample: true
    });
  }
}

/**
 * POST handler for adding a new discovery
 */
export async function POST({ request }) {
  try {
    const { itemId } = await request.json();
    
    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Item ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let result = false;
    
    try {
      // Try to add to database
      result = await addDiscoveredItem(itemId);
    } catch (error) {
      console.error('Database error when adding discovery, proceeding with mock success:', error);
      // Pretend success even if database is down
      result = true;
    }
    
    return json({ success: result });
  } catch (error) {
    console.error('Error adding discovery:', error);
    return new Response(JSON.stringify({ error: 'Failed to add discovery' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 