import type { NewsItem, NewsResponse } from '../types/news.js';
import { newsCategories, newsSources } from '../config/news-sources.js';
import { browser } from '$app/environment';

// Use a stable public CORS proxy
const CORS_PROXY = 'https://corsproxy.io/?';

// Dodajemy dynamiczny import dla rss-parser tylko w przeglądarce
let Parser: any;
let parser: any;

// Inicjalizacja parsera tylko po stronie klienta
async function initParser() {
  if (browser) {
    try {
      const module = await import('rss-parser');
      Parser = module.default;
      parser = new Parser({
        customFields: {
          item: [
            ['media:content', 'media'],
            ['media:thumbnail', 'thumbnail'],
          ],
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize RSS parser:', error);
      return false;
    }
  }
  return false;
}

// Interfejs dla źródła RSS
interface RssItem {
  title?: string;
  contentSnippet?: string;
  content?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  media?: {
    $?: {
      url?: string;
    };
  };
  thumbnail?: {
    $?: {
      url?: string;
    };
  };
}

// Interfejs dla źródła wiadomości
interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: string;
  priority: number;
}

// Implementacja pobierania wiadomości ze źródła
export async function fetchNewsFromSource(sourceId: string): Promise<NewsItem[]> {
  try {
    if (!browser) {
      console.log(`[Server] Skipping fetchNewsFromSource for ${sourceId}`);
      return []; // Zwracamy pustą tablicę na serwerze
    }

    console.log(`Fetching news for source: ${sourceId}`);

    // Inicjalizacja parsera jeśli jeszcze nie został zainicjalizowany
    if (!parser) {
      console.log('Parser not initialized, initializing now...');
      const initialized = await initParser();
      if (!initialized) {
        console.error('RSS parser initialization failed');
        throw new Error('RSS parser could not be initialized');
      }
      console.log('Parser initialized successfully');
    }

    const source = newsSources.find((s: NewsSource) => s.id === sourceId);
    if (!source) {
      console.error(`News source ${sourceId} not found`);
      throw new Error(`News source with ID ${sourceId} not found`);
    }

    // Use the CORS proxy with explicit fetch 
    console.log(`Attempting to fetch via CORS proxy: ${source.url}`);
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(source.url)}`;
    
    // Use native fetch first for better CORS handling
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
    }
    
    const feedText = await response.text();
    
    // Parse the RSS feed manually
    parser.parseString(feedText, (err: any, feed: any) => {
      if (err) {
        console.error('Error parsing RSS:', err);
        throw err;
      }
      console.log(`Successfully fetched ${feed.items?.length || 0} items from ${sourceId}`);
      return processFeedItems(feed, source, sourceId);
    });
    
    // Fallback - if parseString didn't return, try direct parsing
    const feed = parser.parseString(feedText);
    console.log(`Successfully fetched ${feed.items?.length || 0} items from ${sourceId}`);
    return processFeedItems(feed, source, sourceId);
  } catch (error) {
    console.error(`Error fetching news from ${sourceId}:`, error);
    return [];
  }
}

// Helper to process feed items
function processFeedItems(feed: any, source: NewsSource, sourceId: string): NewsItem[] {
  if (!feed || !feed.items || feed.items.length === 0) {
    console.log(`No items found in feed for ${sourceId}`);
    return [];
  }
  
  return feed.items.map((item: RssItem, index: number) => {
    // Extract image URL from media content if available
    let imageUrl;
    if (item.media && item.media.$ && item.media.$.url) {
      imageUrl = item.media.$.url;
    } else if (item.thumbnail && item.thumbnail.$ && item.thumbnail.$.url) {
      imageUrl = item.thumbnail.$.url;
    }

    return {
      id: `${sourceId}-${index}-${Date.now()}`,
      title: item.title || 'Untitled',
      summary: item.contentSnippet || item.content || '',
      url: item.link || '',
      publishDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      source: source.name,
      sourceId: source.id,
      category: source.category,
      imageUrl,
      author: item.creator || item.author || '',
    };
  });
}

// Implementacja pobierania wszystkich wiadomości
export async function fetchAllNews(): Promise<NewsResponse> {
  try {
    // Na serwerze zwracamy puste dane
    if (!browser) {
      return {
        items: [],
        lastUpdated: new Date(),
      };
    }

    const promises = newsSources.map((source: NewsSource) => fetchNewsFromSource(source.id));
    const results = await Promise.all(promises);
    
    // Spłaszczamy i sortujemy (najpierw po priorytecie, potem po dacie)
    const allItems = results
      .flat()
      .sort((a: NewsItem, b: NewsItem) => {
        // First check priority of source
        const sourceA = newsSources.find((s: NewsSource) => s.id === a.sourceId);
        const sourceB = newsSources.find((s: NewsSource) => s.id === b.sourceId);
        
        const priorityA = sourceA ? sourceA.priority : 0;
        const priorityB = sourceB ? sourceB.priority : 0;
        
        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }
        
        // Then sort by date
        return b.publishDate.getTime() - a.publishDate.getTime();
      });

    return {
      items: allItems,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Error fetching all news:', error);
    return {
      items: [],
      lastUpdated: new Date(),
    };
  }
}

// Implementacja pobierania wiadomości według kategorii
export async function fetchNewsByCategory(category: string): Promise<NewsResponse> {
  try {
    // Na serwerze zwracamy puste dane
    if (!browser) {
      return {
        items: [],
        lastUpdated: new Date(),
      };
    }

    const relevantSources = newsSources.filter((source: NewsSource) => source.category === category);
    const promises = relevantSources.map((source: NewsSource) => fetchNewsFromSource(source.id));
    const results = await Promise.all(promises);
    
    const categoryItems = results
      .flat()
      .sort((a: NewsItem, b: NewsItem) => {
        // First priority
        const sourceA = newsSources.find((s: NewsSource) => s.id === a.sourceId);
        const sourceB = newsSources.find((s: NewsSource) => s.id === b.sourceId);
        
        const priorityA = sourceA ? sourceA.priority : 0;
        const priorityB = sourceB ? sourceB.priority : 0;
        
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        
        // Then date
        return b.publishDate.getTime() - a.publishDate.getTime();
      });

    return {
      items: categoryItems,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error(`Error fetching news for category ${category}:`, error);
    return {
      items: [],
      lastUpdated: new Date(),
    };
  }
}

export function getCategoryName(categoryId: string): string {
  return newsCategories[categoryId as keyof typeof newsCategories] || categoryId;
}

export function getAvailableCategories() {
  return Object.entries(newsCategories).map(([id, name]) => ({
    id,
    name
  }));
} 