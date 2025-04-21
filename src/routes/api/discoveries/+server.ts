import { json } from '@sveltejs/kit';
import { getDiscoveredItems, addDiscoveredItem, getComments, saveComment } from '$lib/server/db.js';

/**
 * GET handler for discoveries
 */
export async function GET() {
  try {
    const items = await getDiscoveredItems();
    return json({ items });
  } catch (error) {
    console.error('Error fetching discoveries:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve discoveries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
    
    const result = await addDiscoveredItem(itemId);
    
    return json({ success: result });
  } catch (error) {
    console.error('Error adding discovery:', error);
    return new Response(JSON.stringify({ error: 'Failed to add discovery' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 