import { browser } from '$app/environment';
import type { NewsItem, NewsResponse } from '../types/news.js';

// Log messages to console
function log(message: string, data?: any): void {
  if (data) {
    console.log(`[NewsService] ${message}`, data);
  } else {
    console.log(`[NewsService] ${message}`);
  }
}

// Log errors to console
function logError(message: string, error: any): void {
  console.error(`[NewsService] ERROR: ${message}`, error);
}

/**
 * Fetch all news from the local API
 * @returns {Promise<NewsResponse>} The news response
 */
export async function fetchAllNews(): Promise<NewsResponse> {
  if (!browser) {
    log('Server-side call, returning empty data', null);
    return {
      items: [],
      lastUpdated: new Date(),
    };
  }
  
  try {
    log('Fetching news from local API...', null);
    
    const response = await fetch('/api/news');
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Ensure dates are Date objects
    const items = data.items.map((item: any) => ({
      ...item,
      publishDate: new Date(item.publishDate)
    }));
    
    log(`Fetched ${items.length} news items`, null);
    
    return {
      items,
      lastUpdated: new Date(data.lastUpdated),
      isMock: false
    };
  } catch (error) {
    logError('Error fetching news from API', error);
    
    // Generate sample items if API fails
    return {
      items: generateMockNewsItems('sample', 5),
      lastUpdated: new Date(),
      isMock: true
    };
  }
}

/**
 * Fetch news by category
 * @param {string} category The category to fetch
 * @returns {Promise<NewsResponse>} The news response
 */
export async function fetchNewsByCategory(category: string): Promise<NewsResponse> {
  if (!browser) {
    log(`Server-side call for category ${category}, returning empty data`, null);
    return {
      items: [],
      lastUpdated: new Date(),
    };
  }

  try {
    log(`Fetching news for category: ${category}`, null);
    
    const response = await fetch(`/api/news?category=${encodeURIComponent(category)}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Ensure dates are Date objects
    const items = data.items.map((item: any) => ({
      ...item,
      publishDate: new Date(item.publishDate)
    }));
    
    log(`Fetched ${items.length} news items for category ${category}`, null);
    
    return {
      items,
      lastUpdated: new Date(data.lastUpdated),
      isMock: false
    };
  } catch (error) {
    logError(`Error fetching news for category ${category}`, error);
    
    // Generate sample items if API fails
    return {
      items: generateMockNewsItems(category, 5),
      lastUpdated: new Date(),
      isMock: true
    };
  }
}

/**
 * Get available categories
 * @returns {Array} Array of category objects
 */
export function getAvailableCategories() {
  return [
    { id: 'tech', name: 'Technology' },
    { id: 'programming', name: 'Programming' },
    { id: 'design', name: 'Design' },
    { id: 'business', name: 'Business' },
    { id: 'science', name: 'Science' },
    { id: 'products', name: 'Products' }
  ];
}

/**
 * Generate mock news items (fallback)
 * @param {string} category Category or sourceId
 * @param {number} count Number of items to generate
 * @returns {Array} Array of mock news items
 */
function generateMockNewsItems(category = 'sample', count = 5): NewsItem[] {
  log(`Generating ${count} mock items for ${category}`, null);
  
  const mockItems = [];
  const topics = [
    'Svelte new features', 'TypeScript 5.0', 'Web Components', 
    'CSS Grid improvements', 'JavaScript Performance', 'Web Security',
    'Node.js updates', 'WebAssembly', 'Progressive Web Apps'
  ];
  
  for (let i = 0; i < count; i++) {
    const id = `${category}-mock-${i}-${Date.now()}`;
    const topicIndex = Math.floor(Math.random() * topics.length);
    const date = new Date(Date.now() - i * 3600000);
    
    mockItems.push({
      id,
      title: `${topics[topicIndex]} - Mock Item ${i + 1}`,
      summary: `This is a mock news item for ${topics[topicIndex]} created because the API could not be reached.`,
      url: 'https://example.com/' + id,
      publishDate: date.toISOString(),
      source: 'Mock Source',
      sourceId: 'mock',
      category: category !== 'sample' ? category : (i % 2 === 0 ? 'tech' : 'programming'),
      imageUrl: `https://picsum.photos/seed/${id}/600/400`,
      author: 'Mock Generator',
    });
  }
  
  return mockItems;
} 