import { json } from '@sveltejs/kit';
import { getComments, saveComment, getComment } from '$lib/server/db.js';

/**
 * GET handler for comments
 */
export async function GET({ url }) {
  try {
    const itemId = url.searchParams.get('itemId');
    
    if (itemId) {
      // Get a specific comment
      const comment = await getComment(itemId);
      if (comment) {
        return json({ comment });
      } else {
        return json({ comment: null });
      }
    } else {
      // Get all comments
      const comments = await getComments();
      return json({ comments });
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve comments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
    
    const result = await saveComment(itemId, comment);
    
    return json({ success: result });
  } catch (error) {
    console.error('Error saving comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to save comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 