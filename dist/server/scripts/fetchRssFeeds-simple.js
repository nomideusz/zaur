import { parseStringPromise } from 'xml2js';
/**
 * Fetch and parse an RSS feed
 * @param url The URL of the RSS feed
 * @returns The parsed feed items
 */
async function fetchRssFeed(url) {
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
        return rssItems.map(function (item) {
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
    }
    catch (error) {
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
function generateNewsItemId(item, sourceId) {
    // Create a simple hash function
    function simpleHash(str) {
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
function convertRssToNewsItems(rssItems, source) {
    return rssItems.map(item => {
        // Parse date or use current date if parsing fails
        let publishDate;
        try {
            publishDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
        }
        catch (error) {
            publishDate = new Date().toISOString();
        }
        return {
            id: generateNewsItemId(item, source.id),
            title: item.title,
            summary: item.description?.replace(/<[^>]*>/g, '').substring(0, 200) + '...' || 'No description available',
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
 * Fetch all RSS feeds
 * @param sources The news sources to fetch from
 * @returns Array of news items
 */
export async function fetchAllRssFeeds(sources) {
    console.log('Starting RSS feeds update...', new Date().toISOString());
    try {
        if (!sources || sources.length === 0) {
            console.warn('No sources provided');
            return [];
        }
        console.log(`Fetching from ${sources.length} sources...`);
        // Sort sources by priority (higher number = higher priority)
        const sortedSources = [...sources].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        // Process each source
        const allNewsItems = [];
        let newItemsCount = 0;
        let skippedItemsCount = 0;
        for (const source of sortedSources) {
            console.log(`Fetching from ${source.name} (${source.url})...`);
            const rssItems = await fetchRssFeed(source.url);
            if (rssItems.length > 0) {
                // Convert to news items
                const newsItems = convertRssToNewsItems(rssItems, source);
                allNewsItems.push(...newsItems);
                newItemsCount += newsItems.length;
                console.log(`Found ${newsItems.length} new items from ${source.name} (skipped 0 older items)`);
            }
            else {
                console.log(`No items found from ${source.name}`);
            }
        }
        console.log(`Processing complete: ${newItemsCount} new items found, ${skippedItemsCount} older items skipped`);
        return allNewsItems;
    }
    catch (error) {
        console.error('Error fetching RSS feeds:', error);
        return [];
    }
}
