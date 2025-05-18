import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
// @ts-ignore - Store types are handled in the implementation
import { readNewsData, getCategories, getActiveStoreType, updateNews, getNews } from '$lib/server/newsStoreInit.js';
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

/**
 * GET handler for news
 */
export const GET: RequestHandler = async ({ url }) => {
  const categoryParam = url.searchParams.get('category');
  const storeType = getActiveStoreType();
  
  try {
    // Get categories first for the response
    const categories = await getCategories();
    
    // Use getNews if a category is specified, otherwise use readNewsData
    let newsItems: NewsItem[] = [];
    if (categoryParam) {
      // Get news by category from the active store
      newsItems = await getNews(categoryParam as any) as unknown as NewsItem[];
    } else {
      // Get all news items from the active store
      const newsData = await readNewsData() as unknown as NewsData;
      newsItems = newsData.items;
    }
    
    // If we got items from the store, return them
    if (newsItems && Array.isArray(newsItems) && newsItems.length > 0) {
      return json({
        items: newsItems,
        lastUpdated: new Date().toISOString(),
        categories: categories,
        storeType
      });
    }
    
    // This should rarely happen - if the store returned nothing, use fallback sample data
    console.log('Store returned no items, using fallback sample data');
    
    return json({
      items: categoryParam 
        ? sampleNews.filter(item => item.category === categoryParam)
        : sampleNews,
      lastUpdated: new Date().toISOString(),
      isSample: true,
      categories: categories,
      storeType
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return sample data on error as absolute last resort
    console.log('Error fetching news, using fallback sample data');
    const fallbackItems = categoryParam
      ? sampleNews.filter(item => item.category === categoryParam)
      : sampleNews;
    
    try {
      const categories = await getCategories();
      
      return json({
        items: fallbackItems,
        lastUpdated: new Date().toISOString(),
        isSample: true,
        error: 'Using fallback sample data due to store error',
        categories: categories,
        storeType: 'fallback'
      });
    } catch (catError) {
      // If even getting categories fails, use hardcoded fallback
      return json({
        items: fallbackItems,
        lastUpdated: new Date().toISOString(),
        isSample: true,
        error: 'Using complete fallback data due to store error',
        categories: {
          ai: "Artificial Intelligence",
          dev: "Development",
          crypto: "Cryptocurrency", 
          productivity: "Productivity",
          tools: "Tools & Utilities",
          philosophy: "Philosophy"
        },
        storeType: 'fallback'
      });
    }
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
      // Update or add the news item to the active store via newsStoreInit
      const result = await updateNews([newsItem]) as UpdateResult;
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

 