import { json } from '@sveltejs/kit';
import { fetchAllNews, fetchNewsByCategory } from '$lib/services/newsService.js';

export const GET = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    
    // Pobieramy dane
    const response = category
      ? await fetchNewsByCategory(category)
      : await fetchAllNews();
    
    // Zwracamy odpowiedź
    return json(response);
  } catch (error) {
    console.error('Error fetching news:', error);
    return json(
      { 
        items: [], 
        lastUpdated: new Date(),
        error: 'Failed to fetch news' 
      }, 
      { status: 500 }
    );
  }
}; 