import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
// @ts-ignore - Store types are handled in the implementation
import { readNewsData, getCategories, getActiveStoreType } from '$lib/server/newsStoreInit.js';
import { updateNews } from '$lib/server/newsStoreMock.js'; // Will need to be updated if switching to SQLite
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define the types to match what's returned from the store
interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishDate: string;
  source: string;
  sourceId: string;
  category: string;
  imageUrl?: string;
  author?: string;
}

interface NewsData {
  items: NewsItem[];
  lastUpdated: string;
  categories: Record<string, string>;
}

interface UpdateResult {
  added: number;
  updated: number;
}

// Sample data for fallback mode (only used if everything else fails)
const sampleNews: NewsItem[] = [
  {
    id: 'fallback-1',
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
    id: 'fallback-2',
    title: 'News Storage Implementation',
    summary: 'The news storage implementation provides reliable storage with automatic periodic updates.',
    url: 'https://zaur.app/news/news-store',
    publishDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    source: 'Zaur Updates',
    sourceId: 'zaur',
    category: 'dev',
    imageUrl: 'https://picsum.photos/seed/zaur2/600/400',
    author: 'Zaur Development'
  },
  {
    id: 'fallback-3',
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
  const category = url.searchParams.get('category') || null;
  const storeType = getActiveStoreType();
  
  try {
    // Get news from store using the centralized newsStoreInit functions
    const newsData = readNewsData() as unknown as NewsData;
    
    // Filter by category if specified
    const filteredItems = category && newsData.items 
      ? newsData.items.filter(item => item.category === category)
      : newsData.items;
    
    // If we got items from the store, return them
    if (newsData && filteredItems && filteredItems.length > 0) {
      return json({
        items: filteredItems,
        lastUpdated: newsData.lastUpdated,
        categories: newsData.categories,
        storeType
      });
    }
    
    // This should rarely happen - if the store returned nothing, use sample data
    console.log('Store returned no items, using sample data');
    const sampleItems = await loadSampleNewsFromFile();
    const filteredSampleItems = category 
      ? sampleItems.filter(item => item.category === category)
      : sampleItems;
    
    return json({
      items: filteredSampleItems,
      lastUpdated: new Date().toISOString(),
      isSample: true,
      storeType
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return sample data on error as absolute last resort
    console.log('Error fetching news, using fallback sample data');
    const fallbackItems = category
      ? sampleNews.filter(item => item.category === category)
      : sampleNews;
    
    return json({
      items: fallbackItems,
      lastUpdated: new Date().toISOString(),
      isSample: true,
      error: 'Using fallback sample data due to store error',
      storeType: 'fallback'
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
    
    try {
      // Update or add the news item to store
      // TODO: Make this work with both SQLite and mock store
      const result = updateNews([newsItem]) as UpdateResult;
      return json({ 
        success: true, 
        message: 'News item saved successfully',
        added: result.added,
        updated: result.updated,
        storeType: getActiveStoreType()
      });
    } catch (error) {
      console.error('Error saving to store:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to save news item',
        storeType: getActiveStoreType() 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error processing news item:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      storeType: getActiveStoreType()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

 