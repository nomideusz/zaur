import { json } from '@sveltejs/kit';
import type { NewsItem, NewsResponse } from '$lib/types/news.js';
import { newsCategories, newsSources } from '$lib/config/news-sources.js';
// Import RSS Parser directly (works on server-side)
import Parser from 'rss-parser';

// Setup parser instance
const parser = new Parser({
  customFields: {
    item: [
      'media:content',
      'media:thumbnail',
      'enclosure',
      'content:encoded',
      'description'
    ],
    feed: [
      'image',
      'description'
    ]
  },
  headers: {
    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
    'User-Agent': 'Mozilla/5.0 (compatible; NewsApp/1.0)'
  },
  timeout: 10000,
});

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

// Generate better mock data
function generateMockItems(count = 10) {
  const items = [];
  const categories = Object.keys(newsCategories);
  const sources = newsSources;
  
  for (let i = 0; i < count; i++) {
    const sourceIndex = i % sources.length;
    const source = sources[sourceIndex];
    const categoryIndex = i % categories.length;
    const category = categories[categoryIndex];
    
    items.push({
      id: `dynamic-mock-${i}-${Date.now()}`,
      title: `${newsCategories[category as keyof typeof newsCategories]} News ${i + 1} from ${source.name}`,
      summary: `This is a generated mock article for ${source.name} in the ${newsCategories[category as keyof typeof newsCategories]} category.`,
      url: 'https://example.com/news/' + i,
      publishDate: new Date(Date.now() - i * 3600000), // Each item 1 hour apart
      source: source.name,
      sourceId: source.id,
      category: source.category,
      imageUrl: `https://picsum.photos/seed/${source.id}-${i}/600/400`,
      author: 'Generated Author'
    });
  }
  
  return items;
}

// Fetch RSS feed directly
async function fetchRssFeed(url: string, fetch: any): Promise<string | null> {
  try {
    // Try direct fetch first
    console.log(`Direct RSS fetch: ${url}`);
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; NewsApp/1.0)'
      }
    });
    
    if (response.ok) {
      return await response.text();
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to fetch RSS: ${url}`, error);
    return null;
  }
}

// Process an RSS item into a NewsItem
function processRssItem(item: any, source: any, index: number): NewsItem | null {
  if (!item) return null;
  
  // Extract image URL from media content if available
  let imageUrl;
  if (item['media:content'] && item['media:content'].url) {
    imageUrl = item['media:content'].url;
  } else if (item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  } else if (item.enclosure && item.enclosure.url) {
    imageUrl = item.enclosure.url;
  }

  // Special handling for Hacker News
  let title = item.title || 'Untitled';
  let summary = '';
  let url = item.link || '';
  
  if (source.id === 'techmeme') {
    // Clean title
    title = title.replace(/URL:.*$/, '').trim();
    
    // Get description with fallbacks
    const description = item.description || item.content || '';
    
    // Strip HTML and decode entities
    const plainText = cleanHtmlContent(description);
    
    // For HN feeds, extract the real URL
    const urlMatch = description.match(/Article URL:\s*<a[^>]*href=["']([^"']+)["']/i);
    if (urlMatch && urlMatch[1]) {
      url = urlMatch[1]; // Use the actual article URL
    }
    
    // Remove points and comments info from summary
    summary = plainText.replace(/Points:\s*\d+/g, '')
                      .replace(/#\s*Comments:\s*\d+/g, '')
                      .replace(/Article URL:.*$/gm, '')
                      .replace(/Comments URL:.*$/gm, '')
                      .trim();
    
    // If summary is too short after cleaning, use generic text
    if (summary.length < 20) {
      summary = "View the full article on Hacker News for more details.";
    }
  } else {
    // Standard processing for other sources
    summary = item.contentSnippet || 
              item.description || 
              item.content || 
              item['content:encoded'] || 
              '';
    
    // Clean HTML tags from summary
    summary = cleanHtmlContent(summary);
  }
  
  // Basic language detection using common Spanish words
  // Skip if title or summary contains too many Spanish words
  if (isLikelySpanish(title) || isLikelySpanish(summary)) {
    console.log(`Skipping likely Spanish content: ${title}`);
    return null;
  }

  return {
    id: `${source.id}-${index}-${Date.now()}`,
    title: title,
    summary: summary.substring(0, 300) + (summary.length > 300 ? '...' : ''),
    url: url,
    publishDate: item.pubDate ? new Date(item.pubDate) : new Date(),
    source: source.name,
    sourceId: source.id,
    category: source.category,
    imageUrl,
    author: item.creator || item.author || '',
  };
}

// Helper function to clean HTML content
function cleanHtmlContent(html: string): string {
  if (!html) return '';
  
  return html
    // Remove HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Decode common HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    // Normalize whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Very basic language detection for Spanish
function isLikelySpanish(text: string): boolean {
  if (!text) return false;
  
  // Most common Spanish words and patterns
  const spanishPatterns = [
    /\b(el|la|los|las|un|una|unos|unas)\b/gi, // articles
    /\b(y|o|pero|porque|como|cuando|donde|que)\b/gi, // conjunctions
    /\b(en|de|con|por|para|sin|sobre|entre)\b/gi, // prepositions
    /\b(es|son|está|están|tiene|tienen)\b/gi, // common verbs
    /[áéíóúñ¿¡]/gi, // Spanish-specific characters
    /\b(más|también|muy|mucho|muchos|muchas)\b/gi, // common adverbs
  ];
  
  // Count matches
  let spanishCount = 0;
  for (const pattern of spanishPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      spanishCount += matches.length;
    }
  }
  
  // Get total word count
  const wordCount = text.split(/\s+/).length;
  
  // If more than 20% of words match Spanish patterns, consider it Spanish
  const threshold = Math.max(3, wordCount * 0.2);
  return spanishCount > threshold;
}

// Fetch news from a single source
async function fetchNewsFromSource(source: any, fetch: any): Promise<NewsItem[]> {
  try {
    console.log(`Fetching news from source: ${source.name} (${source.url})`);
    
    // Check if this is a Nature source
    const isNatureSource = source.id.toLowerCase().includes('nature') || 
                          source.name.toLowerCase().includes('nature');
    
    // Fetch RSS feed
    const feedText = await fetchRssFeed(source.url, fetch);
    if (!feedText) {
      console.log(`No feed text returned for ${source.id}`);
      return [];
    }
    
    // Parse RSS feed
    try {
      const feed = await parser.parseString(feedText);
      console.log(`Successfully parsed feed for ${source.id} with ${feed.items?.length || 0} items`);
      
      if (!feed.items || !Array.isArray(feed.items) || feed.items.length === 0) {
        console.log(`No items in feed for ${source.id}`);
        return [];
      }
      
      // Process items
      let items = feed.items
        .map((item, index) => processRssItem(item, source, index))
        .filter(Boolean) as NewsItem[];
      
      // Limit items from Nature to prevent domination
      if (isNatureSource && items.length > 0) {
        console.log(`Limiting Nature source ${source.id} to 1 item (was ${items.length})`);
        items = [items[0]]; // Just take the first item
      }
      
      console.log(`Processed ${items.length} items from ${source.id}`);
      return items;
    } catch (parseError) {
      console.error(`Failed to parse feed for ${source.id}:`, parseError);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching news from ${source.id}:`, error);
    return [];
  }
}

export const GET = async ({ url, fetch }) => {
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
    
    // Get sources to fetch based on category
    const sourcesToFetch = category 
      ? newsSources.filter(source => source.category === category)
      : newsSources;
    
    console.log(`Fetching from ${sourcesToFetch.length} sources`);
    
    // Fetch from all sources
    const promiseResults = await Promise.allSettled(
      sourcesToFetch.map(source => fetchNewsFromSource(source, fetch))
    );
    
    // Process results
    const successfulResults = promiseResults
      .filter((result): result is PromiseFulfilledResult<NewsItem[]> => 
        result.status === 'fulfilled')
      .map(result => result.value);
    
    // Log failures
    promiseResults
      .filter((result): result is PromiseRejectedResult => 
        result.status === 'rejected')
      .forEach((result, index) => {
        console.error(`Source fetch failed:`, result.reason);
      });
    
    // Group items by source for balanced distribution
    const itemsBySource = new Map<string, NewsItem[]>();
    
    // Organize items by source
    successfulResults.forEach(items => {
      if (!items.length) return;
      const sourceId = items[0].sourceId;
      if (!itemsBySource.has(sourceId)) {
        itemsBySource.set(sourceId, []);
      }
      itemsBySource.get(sourceId)?.push(...items);
    });
    
    // Apply source limits - max 2 items per source by default
    const MAX_ITEMS_PER_SOURCE = 2;
    const balancedItems: NewsItem[] = [];
    
    // First pass: Collect one item from each source
    itemsBySource.forEach((items, sourceId) => {
      // Sort items by date (newest first)
      const sortedItems = [...items].sort((a, b) => 
        b.publishDate.getTime() - a.publishDate.getTime()
      );
      
      // Start with one item from each source
      if (sortedItems.length > 0) {
        balancedItems.push(sortedItems[0]);
        
        // Add a second item only if not Nature and we have more
        const isNatureSource = sourceId.toLowerCase().includes('nature');
        if (!isNatureSource && sortedItems.length > 1) {
          balancedItems.push(sortedItems[1]);
        }
      }
    });
    
    // If no items, use mock data
    if (balancedItems.length === 0) {
      console.log('No news items found, using fallback data');
      return json({
        items: generateMockItems(15).filter(item => !category || item.category === category),
        lastUpdated: new Date(),
        isMock: true
      });
    }
    
    // Sort items by date first, then by priority
    const sortedItems = balancedItems.sort((a, b) => {
      // First sort by date (newest first)
      const dateComparison = b.publishDate.getTime() - a.publishDate.getTime();
      
      // If dates are exactly the same (rare), use source priority as tiebreaker
      if (dateComparison === 0) {
        const sourceA = newsSources.find(s => s.id === a.sourceId);
        const sourceB = newsSources.find(s => s.id === b.sourceId);
        
        const priorityA = sourceA ? sourceA.priority : 0;
        const priorityB = sourceB ? sourceB.priority : 0;
        
        return priorityB - priorityA;
      }
      
      return dateComparison;
    });
    
    console.log(`Returning ${sortedItems.length} balanced news items`);
    return json({
      items: sortedItems,
      lastUpdated: new Date(),
      isMock: false
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return mock data on error
    console.log('Returning mock data due to error');
    return json(
      { 
        items: generateMockItems(15).filter(item => {
          // Access category from closure scope
          const categoryParam = url.searchParams.get('category');
          return !categoryParam || item.category === categoryParam;
        }),
        lastUpdated: new Date(),
        error: 'Failed to fetch news, using fallback data',
        isMock: true
      }
    );
  }
}; 