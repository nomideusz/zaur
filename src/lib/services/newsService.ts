import type { NewsItem, NewsResponse } from '../types/news.js';
import { newsCategories, newsSources } from '../config/news-sources.js';
import { browser } from '$app/environment';

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
      return []; // Zwracamy pustą tablicę na serwerze
    }

    // Inicjalizacja parsera jeśli jeszcze nie został zainicjalizowany
    if (!parser) {
      const initialized = await initParser();
      if (!initialized) {
        throw new Error('RSS parser could not be initialized');
      }
    }

    const source = newsSources.find((s: NewsSource) => s.id === sourceId);
    if (!source) {
      throw new Error(`News source with ID ${sourceId} not found`);
    }

    // Use a CORS proxy to access the feed
    const proxyUrl = encodeURIComponent(source.url);
    const feed = await parser.parseURL(`/api/cors-proxy?url=${proxyUrl}`);
    
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
  } catch (error) {
    console.error(`Error fetching news from ${sourceId}:`, error);
    return [];
  }
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