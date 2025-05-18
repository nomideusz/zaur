// @ts-nocheck
import { readNewsData, updateNews, getCategories } from '../newsStoreInit.js';
import { parseStringPromise } from 'xml2js';
import pg from 'pg';
// For usage outside of SvelteKit
const dev = process.env.NODE_ENV !== 'production';
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
        // Get news data from the store which will have the sources
        const newsData = await readNewsData();
        if (!newsData || !newsData.sources || newsData.sources.length === 0) {
            console.warn('No sources found in database');
            return [];
        }
        console.log(`Retrieved ${newsData.sources.length} sources from database`);
        // Return the sources array
        return newsData.sources;
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
        // Get news data from the store
        const newsData = await readNewsData();
        if (newsData && newsData.items && newsData.items.length > 0) {
            // Sort items by publishDate (newest first)
            const sortedItems = [...newsData.items].sort((a, b) => {
                const dateA = new Date(a.publishDate);
                const dateB = new Date(b.publishDate);
                return dateB.getTime() - dateA.getTime();
            });
            const timestamp = new Date(sortedItems[0].publishDate);
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
        const allNewItems = [];
        let fetchedCount = 0;
        for (const source of sortedSources) {
            if (!source.url) {
                console.warn(`Source ${source.name} (${source.id}) has no URL, skipping`);
                continue;
            }
            console.log(`Fetching from ${source.name} (${source.url})...`);
            // Fetch RSS feed
            const rssItems = await fetchRssFeed(source.url);
            fetchedCount += rssItems.length;
            console.log(`Found ${rssItems.length} items from ${source.name}`);
            // Convert to our news item format
            const newsItems = convertRssToNewsItems(rssItems, source);
            // Only add items newer than our newest existing item
            const newItems = newsItems.filter(item => {
                try {
                    const itemDate = new Date(item.publishDate);
                    return itemDate.getTime() > newestExistingTimestamp.getTime();
                }
                catch (error) {
                    // If date parsing fails, include the item to be safe
                    return true;
                }
            });
            // Add to our collection
            allNewItems.push(...newItems);
        }
        // Update the database with all new items
        const result = await updateNews(allNewItems);
        console.log(`RSS feeds update complete. Fetched: ${fetchedCount}, New: ${allNewItems.length}, Added: ${result.added}, Updated: ${result.updated}`);
        return {
            added: result.added,
            updated: result.updated,
            total: allNewItems.length
        };
    }
    catch (error) {
        console.error('Error updating RSS feeds:', error);
        return { added: 0, updated: 0, total: 0 };
    }
}
