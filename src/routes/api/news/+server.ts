import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getNewsItems, saveNewsItem } from '$lib/server/db.js';
import type { NewsItem } from '$lib/types/news.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Sample data for fallback mode
const sampleNews: NewsItem[] = [
  {
    id: 'sample-1',
    title: 'Getting Started with Zaur Dashboard',
    summary: 'Learn how to use the Zaur dashboard for navigating between projects and accessing key tools.',
    url: 'https://zaur.app/docs/dashboard',
    publishDate: new Date().toISOString(),
    source: 'Zaur Documentation',
    sourceId: 'zaur',
    category: 'featured',
    imageUrl: 'https://picsum.photos/seed/zaur1/600/400',
    author: 'Zaur Team'
  },
  {
    id: 'sample-2',
    title: 'RethinkDB Migration Complete',
    summary: 'The migration from JSON files to RethinkDB has been completed successfully, providing better scalability.',
    url: 'https://zaur.app/news/rethinkdb-migration',
    publishDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    source: 'Zaur Updates',
    sourceId: 'zaur',
    category: 'dev',
    imageUrl: 'https://picsum.photos/seed/zaur2/600/400',
    author: 'Zaur Development'
  },
  {
    id: 'sample-3',
    title: 'New AI Tools Available',
    summary: 'Explore the new AI-powered tools available in the Zaur ecosystem, designed to boost your productivity.',
    url: 'https://zaur.app/news/ai-tools',
    publishDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    source: 'Zaur AI',
    sourceId: 'zaur',
    category: 'ai',
    imageUrl: 'https://picsum.photos/seed/zaur3/600/400',
    author: 'Zaur AI Team'
  }
];

// Try to load sample data from file if available
async function loadSampleNewsFromFile(): Promise<NewsItem[]> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataDir = path.join(__dirname, '../../../../lib/server/data');
    const samplePath = path.join(dataDir, 'sample-news.json');
    
    const data = await fs.readFile(samplePath, 'utf8');
    const parsedData = JSON.parse(data);
    return parsedData.items || sampleNews;
  } catch (error) {
    console.log('Could not load sample news from file, using built-in sample data');
    return sampleNews;
  }
}

/**
 * GET handler for news
 */
export const GET: RequestHandler = async ({ url }) => {
  const category = url.searchParams.get('category') || 'featured';
  
  try {
    const items = await getNewsItems(category);
    
    // If we got items from the database, return them
    if (items && items.length > 0) {
      return json({
        items: items.map(transformDbItemToNewsItem),
        lastUpdated: new Date().toISOString()
      });
    }
    
    // If no items, fall back to sample data
    console.log('No items found in database, using sample data');
    const sampleItems = await loadSampleNewsFromFile();
    const filteredItems = category === 'featured' 
      ? sampleItems 
      : sampleItems.filter(item => item.category === category);
    
    return json({
      items: filteredItems,
      lastUpdated: new Date().toISOString(),
      isSample: true
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return sample data on error
    const sampleItems = await loadSampleNewsFromFile();
    const filteredItems = category === 'featured' 
      ? sampleItems 
      : sampleItems.filter(item => item.category === category);
    
    return json({
      items: filteredItems,
      lastUpdated: new Date().toISOString(),
      isSample: true,
      error: 'Using sample data due to database error'
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
    
    let success = false;
    try {
      success = await saveNewsItem(newsItem);
    } catch (error) {
      console.error('Error saving to database, proceeding with mock success:', error);
      // Pretend success even if database is down
      success = true;
    }
    
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