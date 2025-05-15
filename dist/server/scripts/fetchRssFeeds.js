// @ts-nocheck
import { readNewsData, updateNews } from '../newsStore.js';
import { parseStringPromise } from 'xml2js';
import rethinkdb from 'rethinkdb';
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
    // Create a simple hash function since we can't rely on crypto in the browser
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
 * Get sources from the database
 * @returns Array of news sources
 */
async function getSourcesFromDatabase() {
    try {
        // Connect to database
        const conn = await rethinkdb.connect({
            host: process.env.RETHINKDB_HOST || 'localhost',
            port: parseInt(process.env.RETHINKDB_PORT || '28015', 10)
        });
        // Use the news database
        conn.use(process.env.RETHINKDB_DB || 'zaur_news');
        // Get sources
        const cursor = await rethinkdb.table('sources').run(conn);
        const sources = await cursor.toArray();
        // Close connection
        await conn.close();
        if (sources.length === 0) {
            console.warn('No sources found in database');
        }
        else {
            console.log(`Retrieved ${sources.length} sources from database`);
        }
        // Cast to NewsSource[]
        return sources.map((source) => ({
            id: source.id || '',
            name: source.name || '',
            url: source.url || '',
            category: source.category || 'general',
            priority: typeof source.priority === 'number' ? source.priority : 0
        }));
    }
    catch (error) {
        console.error('Error getting sources from database:', error);
        return [];
    }
}
/**
 * Get the newest article timestamp from the database
 * @returns Date of the newest article
 */
async function getNewestArticleTimestamp() {
    try {
        // Connect to database
        const conn = await rethinkdb.connect({
            host: process.env.RETHINKDB_HOST || 'localhost',
            port: parseInt(process.env.RETHINKDB_PORT || '28015', 10)
        });
        // Use the news database
        conn.use(process.env.RETHINKDB_DB || 'zaur_news');
        // Get newest article by publish date
        const cursor = await rethinkdb.table('news')
            .orderBy(rethinkdb.desc('publishDate'))
            .limit(1)
            .run(conn);
        const items = await cursor.toArray();
        // Close connection
        await conn.close();
        if (items.length > 0 && items[0].publishDate) {
            const timestamp = new Date(items[0].publishDate);
            console.log(`Newest existing article timestamp: ${timestamp.toISOString()}`);
            return timestamp;
        }
        console.log('No existing articles found, using epoch start');
        return new Date(0); // Default to epoch start
    }
    catch (error) {
        console.error('Error getting newest article timestamp:', error);
        return new Date(0); // Default to epoch start on error
    }
}
/**
 * Fetch all RSS feeds and update the news database
 */
export async function fetchAllRssFeeds() {
    console.log('Starting RSS feeds update...', new Date().toISOString());
    try {
        // Get sources from database
        const sources = await getSourcesFromDatabase();
        if (sources.length === 0) {
            console.warn('No sources found, cannot update RSS feeds');
            return { added: 0, updated: 0, total: 0 };
        }
        // Get newest article timestamp
        const newestExistingTimestamp = await getNewestArticleTimestamp();
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
                // Filter items that are newer than our newest existing item
                const newRssItems = rssItems.filter(item => {
                    try {
                        const itemDate = new Date(item.pubDate);
                        return itemDate > newestExistingTimestamp;
                    }
                    catch (e) {
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
            }
            else {
                console.log(`No items found from ${source.name}`);
            }
        }
        console.log(`Processing complete: ${newItemsCount} new items found, ${skippedItemsCount} older items skipped`);
        if (allNewsItems.length > 0) {
            // Update news database with new items
            const result = await updateNews(allNewsItems);
            console.log(`News updated successfully. Added: ${result.added}, Updated: ${result.updated}`);
            return result;
        }
        else {
            console.log('No new items found from any source');
            return { added: 0, updated: 0, total: 0 };
        }
    }
    catch (error) {
        console.error('Error updating RSS feeds:', error);
        return { added: 0, updated: 0, total: 0 };
    }
}
