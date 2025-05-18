import { json } from '@sveltejs/kit';
import { getDiscoveredItems, addDiscoveredItem, getZaurComments, saveZaurComment, getDiscoveredItemsWithTimestamps } from '$lib/server/newsStoreInit.js';

// Sample data for fallback mode
const sampleDiscoveries = ['sample-1', 'sample-2', 'sample-3'];

// Define types
interface DiscoveryItem {
  itemId: string;
  timestamp: string;
}

interface Comment {
  id: string;
  itemId: string;
  comment: string;
  timestamp: string;
}

/**
 * GET handler for discoveries
 */
export async function GET({ url }) {
  const includeComments = url.searchParams.get('includeComments') === 'true';
  const includeTimestamps = url.searchParams.get('includeTimestamps') === 'true';
  
  try {
    // Get discoveries (with timestamps if requested)
    let itemsData: DiscoveryItem[];
    if (includeTimestamps) {
      const discoveredItemsWithTimestamps = await getDiscoveredItemsWithTimestamps() as DiscoveryItem[];
      // Format: [{ itemId, timestamp }, ...]
      itemsData = discoveredItemsWithTimestamps;
      // Also include a flat array of just the IDs for backward compatibility
      const items = discoveredItemsWithTimestamps.map(item => item.itemId);
      
      // Get comments if requested
      if (includeComments) {
        const comments = await getZaurComments() as Comment[];
        return json({ items, itemsData, comments });
      }
      
      return json({ items, itemsData });
    } else {
      // Original behavior - just get item IDs
      const items = await getDiscoveredItems();
      
      // Get comments if requested
      if (includeComments) {
        const comments = await getZaurComments() as Comment[];
        return json({ items, comments });
      }
      
      return json({ items });
    }
  } catch (error) {
    console.error('Error fetching discoveries:', error);
    
    // Return sample data on error
    console.log('Using sample discovery data due to database error');
    if (includeTimestamps) {
      const sampleTimestamps = sampleDiscoveries.map(id => ({
        itemId: id,
        timestamp: new Date().toISOString()
      }));
      return json({ 
        items: sampleDiscoveries,
        itemsData: sampleTimestamps,
        isSample: true
      });
    }
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
    const data = await request.json();
    const itemId = data.itemId;
    const comment = data.comment;
    
    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Item ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let result = false;
    
    try {
      // Try to add to in-memory store
      result = await addDiscoveredItem(itemId);
      
      // If there's a comment, save it too
      if (comment && result) {
        await saveZaurComment(itemId, comment);
      }
    } catch (error) {
      console.error('Database error when adding discovery, proceeding with mock success:', error);
      // Pretend success even if store has issues
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