import { readNewsData, updateNews } from '../newsStore.js';
import { parseStringPromise } from 'xml2js';

// Define interfaces locally if import path is causing issues
interface RssItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid: string;
  creator: string;
  enclosure: string;
}

interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: string;
  priority: number;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishDate: string;
  source: string;
  sourceId: string;
  category: string;
  imageUrl: string | null;
  author: string;
}

/**
 * Fetch and parse an RSS feed
 * @param url The URL of the RSS feed
 * @returns The parsed feed items
 */
async function fetchRssFeed(url: string): Promise<RssItem[]> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }
    
    const xml = await response.text();
    
    // Server-side XML parsing using xml2js
    const parsedResult = await parseStringPromise(xml, {
      explicitArray: false,
      trim: true
    });
    
    // Handle different RSS formats
    const channel = parsedResult.rss?.channel;
    if (!channel) {
      console.warn(`No channel found in RSS feed: ${url}`);
      return [];
    }
    
    // Process items
    const rssItems = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
    
    // Map to our simplified format
    return rssItems.map(function(item: Record<string, any>): RssItem {
      return {
        title: item.title || '',
        description: item.description || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        guid: item.guid?._?.toString() || item.guid?.toString() || '',
        creator: item['dc:creator'] || item.author || '',
        enclosure: item.enclosure?.url || ''
      };
    });
  } catch (error) {
    console.error(`Error fetching RSS feed from ${url}:`, error);
    return [];
  }
}

/**
 * Generate a deterministic ID from a feed item
 * @param item The RSS feed item
 * @param sourceId The source ID
 * @returns A unique ID
 */
function generateNewsItemId(item: RssItem, sourceId: string): string {
  // Create a simple hash function since we can't rely on crypto in the browser
  function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  // Use the guid if available, otherwise create a hash from title and link
  if (item.guid) {
    return `${sourceId}-${simpleHash(item.guid)}`;
  }
  
  const hash = simpleHash(`${item.title}${item.link}`);
  return `${sourceId}-${hash}`;
}

/**
 * Convert RSS feed items to NewsItem format
 * @param rssItems The RSS feed items
 * @param source The source information
 * @returns The converted NewsItems
 */
function convertRssToNewsItems(rssItems: RssItem[], source: NewsSource): NewsItem[] {
  return rssItems.map(item => {
    // Parse date or use current date if parsing fails
    let publishDate: string;
    try {
      publishDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
    } catch (error) {
      publishDate = new Date().toISOString();
    }
    
    return {
      id: generateNewsItemId(item, source.id),
      title: item.title,
      summary: item.description.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
      url: item.link,
      publishDate,
      source: source.name,
      sourceId: source.id,
      category: source.category,
      imageUrl: item.enclosure || null,
      author: item.creator || 'Unknown'
    };
  });
}

/**
 * Fetch all RSS feeds and update the news database
 */
export async function fetchAllRssFeeds() {
  console.log('Starting RSS feeds update...', new Date().toISOString());
  
  try {
    // Get existing news data
    const newsData = readNewsData();
    
    // Find the timestamp of the newest article we currently have
    let newestExistingTimestamp = new Date(0); // Default to epoch start
    if (newsData.items && newsData.items.length > 0) {
      // Sort by date and get the newest
      const sortedItems = [...newsData.items].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      if (sortedItems[0] && sortedItems[0].publishDate) {
        newestExistingTimestamp = new Date(sortedItems[0].publishDate);
        console.log(`Newest existing article timestamp: ${newestExistingTimestamp.toISOString()}`);
      }
    }
    
    // Cast sources to NewsSource[] with default values where needed
    const sources = (newsData.sources || []).map((source: any) => ({
      id: source.id || '',
      name: source.name || '',
      url: source.url || '',
      category: source.category || 'general',
      priority: typeof source.priority === 'number' ? source.priority : 0
    })) as NewsSource[];
    
    if (sources.length === 0) {
      console.warn('No sources defined in news data');
      return;
    }
    
    console.log(`Fetching from ${sources.length} sources...`);
    
    // Sort sources by priority (higher number = higher priority)
    const sortedSources = [...sources].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Process each source
    const allNewsItems: NewsItem[] = [];
    let newItemsCount = 0;
    let skippedItemsCount = 0;
    
    for (const source of sortedSources) {
      console.log(`Fetching from ${source.name} (${source.url})...`);
      
      const rssItems = await fetchRssFeed(source.url);
      
      if (rssItems.length > 0) {
        // Filter items that are newer than our newest existing item
        const newRssItems = rssItems.filter(item => {
          try {
            const itemDate = new Date(item.pubDate);
            return itemDate > newestExistingTimestamp;
          } catch (e) {
            // If we can't parse the date, include the item to be safe
            return true;
          }
        });
        
        // Count skipped items
        skippedItemsCount += (rssItems.length - newRssItems.length);
        
        // Only process newer items
        const newsItems = convertRssToNewsItems(newRssItems, source);
        allNewsItems.push(...newsItems);
        newItemsCount += newsItems.length;
        
        console.log(`Found ${newsItems.length} new items from ${source.name} (skipped ${rssItems.length - newRssItems.length} older items)`);
      } else {
        console.log(`No items found from ${source.name}`);
      }
    }
    
    console.log(`Processing complete: ${newItemsCount} new items found, ${skippedItemsCount} older items skipped`);
    
    if (allNewsItems.length > 0) {
      // Update news database with new items
      // @ts-ignore - Types might not match exactly, but the structure is compatible
      const updatedData = updateNews(allNewsItems);
      console.log(`News updated successfully. ${updatedData.items.length} items available.`);
      return updatedData;
    } else {
      console.log('No new items found from any source');
      return newsData;
    }
  } catch (error) {
    console.error('Error updating RSS feeds:', error);
    throw error;
  }
} 