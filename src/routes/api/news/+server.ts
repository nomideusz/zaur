import { json } from '@sveltejs/kit';
import { fetchAllNews, fetchNewsByCategory } from '$lib/services/newsService.js';

// Mock data for testing when real data fails
const mockNewsItems = [
  {
    id: 'mock-1',
    title: 'Mock News Article 1',
    summary: 'This is a mock news article for testing when the real RSS feeds fail to load.',
    url: 'https://example.com/news/1',
    publishDate: new Date(),
    source: 'Mock News',
    sourceId: 'mock',
    category: 'tech',
    author: 'Mock Author'
  },
  {
    id: 'mock-2',
    title: 'Mock News Article 2',
    summary: 'Another mock article with different content for testing purposes.',
    url: 'https://example.com/news/2',
    publishDate: new Date(),
    source: 'Mock News',
    sourceId: 'mock',
    category: 'programming',
    author: 'Mock Author'
  }
];

export const GET = async ({ url }) => {
  try {
    console.log('News API request received');
    const category = url.searchParams.get('category');
    const useMock = url.searchParams.get('mock') === 'true';
    
    console.log(`Fetching news${category ? ` for category: ${category}` : ''}`);
    
    if (useMock) {
      console.log('Using mock data as requested');
      return json({
        items: mockNewsItems.filter(item => !category || item.category === category),
        lastUpdated: new Date()
      });
    }
    
    // Pobieramy dane
    const response = category
      ? await fetchNewsByCategory(category)
      : await fetchAllNews();
    
    // If no items were returned but no error occurred, return mock data
    if (response.items.length === 0) {
      console.log('No news items found, using fallback data');
      return json({
        items: mockNewsItems.filter(item => !category || item.category === category),
        lastUpdated: new Date(),
        note: 'Using fallback data as real feeds returned no results'
      });
    }
    
    // Zwracamy odpowiedź
    console.log(`Returning ${response.items.length} news items`);
    return json(response);
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return mock data on error
    console.log('Returning mock data due to error');
    return json(
      { 
        items: mockNewsItems.filter(item => {
          // Access category from closure scope
          const categoryParam = url.searchParams.get('category');
          return !categoryParam || item.category === categoryParam;
        }),
        lastUpdated: new Date(),
        error: 'Failed to fetch news, using fallback data'
      }
    );
  }
}; 