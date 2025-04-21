import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getNewsItems, saveNewsItem } from '$lib/server/db.js';
import type { NewsItem } from '$lib/types/news.js';

/**
 * GET handler for news
 */
export const GET: RequestHandler = async ({ url }) => {
  const category = url.searchParams.get('category') || 'featured';
  
  try {
    const items = await getNewsItems(category);
    
    return json({
      items: items.map(transformDbItemToNewsItem),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve news' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

/**
 * POST handler for adding or updating a news item
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const newsItem = await request.json();
    
    if (!newsItem.id || !newsItem.title) {
      return new Response(JSON.stringify({ error: 'Invalid news item format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Ensure publishDate is a string
    if (newsItem.publishDate instanceof Date) {
      newsItem.publishDate = newsItem.publishDate.toISOString();
    }
    
    const success = await saveNewsItem(newsItem);
    
    if (success) {
      return json({ success: true, message: 'News item saved successfully' });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to save news item' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error saving news item:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Transform a database item to a NewsItem
 */
function transformDbItemToNewsItem(dbItem: any): NewsItem {
  return {
    id: dbItem.id,
    title: dbItem.title,
    summary: dbItem.summary,
    url: dbItem.url,
    publishDate: typeof dbItem.publishDate === 'string' 
      ? dbItem.publishDate 
      : new Date(dbItem.publishDate).toISOString(),
    source: dbItem.source,
    sourceId: dbItem.sourceId,
    category: dbItem.category,
    imageUrl: dbItem.imageUrl,
    author: dbItem.author
  };
} 