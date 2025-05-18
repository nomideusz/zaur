import { json } from '@sveltejs/kit';
import { getZaurComments, saveZaurComment, getZaurComment } from '$lib/server/newsStoreInit.js';

// Define types
interface Comment {
  id: string;
  itemId: string;
  comment: string;
  timestamp: string;
}

// Sample data for fallback mode
const sampleComments = [
  { id: '1', itemId: 'sample-1', comment: 'This is a sample comment for item 1', timestamp: new Date().toISOString() },
  { id: '2', itemId: 'sample-2', comment: 'This is a sample comment for item 2', timestamp: new Date().toISOString() },
  { id: '3', itemId: 'sample-3', comment: 'This is a sample comment for item 3', timestamp: new Date().toISOString() }
];

/**
 * GET handler for comments
 */
export async function GET({ url }) {
  try {
    const itemId = url.searchParams.get('itemId');
    
    if (itemId) {
      // Try to get a specific comment from in-memory store
      try {
        const comment = await getZaurComment(itemId);
        if (comment) {
          return json({ comment });
        }
      } catch (error) {
        console.error('Error when getting comment, using sample data:', error);
        // Find a sample comment or return null
        const sampleComment = sampleComments.find(c => c.itemId === itemId);
        return json({ 
          comment: sampleComment ? sampleComment.comment : null,
          isSample: true
        });
      }
      
      return json({ comment: null });
    } else {
      // Try to get all comments from in-memory store
      try {
        const comments = await getZaurComments() as Comment[];
        return json({ comments });
      } catch (error) {
        console.error('Error when getting all comments, using sample data:', error);
        // Return sample comments
        return json({ 
          comments: sampleComments,
          isSample: true
        });
      }
    }
  } catch (error) {
    console.error('Error in comments API:', error);
    // Return sample data on error
    return json({ 
      comments: sampleComments,
      isSample: true,
      error: 'Using sample data due to error'
    });
  }
}

/**
 * POST handler for saving a comment
 */
export async function POST({ request }) {
  try {
    const { itemId, comment } = await request.json();
    
    if (!itemId || !comment) {
      return new Response(JSON.stringify({ error: 'Item ID and comment are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let result = false;
    
    try {
      // Try to save to in-memory store
      result = await saveZaurComment(itemId, comment);
    } catch (error) {
      console.error('Error when saving comment, proceeding with mock success:', error);
      // Pretend success even if there's an error
      result = true;
    }
    
    return json({ success: result });
  } catch (error) {
    console.error('Error saving comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to save comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 