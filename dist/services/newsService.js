import { newsCategories, newsSources } from '../config/news-sources.js';
import { browser } from '$app/environment';
// Use a stable public CORS proxy with multiple fallbacks
const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://proxy.cors.sh/'
];
// Keep track of proxy usage to prevent rate limiting
const proxyUsage = {
    timestamps: new Map(),
    // Add a timestamp for proxy usage
    logUse(proxy) {
        if (!browser)
            return; // Skip on server
        const now = Date.now();
        if (!this.timestamps.has(proxy)) {
            this.timestamps.set(proxy, []);
        }
        // Add current timestamp
        const times = this.timestamps.get(proxy);
        times.push(now);
        // Prune old timestamps (older than 60 seconds)
        const cutoff = now - 60000;
        this.timestamps.set(proxy, times.filter(time => time > cutoff));
    },
    // Check if a proxy is being rate limited
    isRateLimited(proxy) {
        if (!browser)
            return false; // Skip on server
        if (!this.timestamps.has(proxy))
            return false;
        const times = this.timestamps.get(proxy);
        // If more than 5 requests in the last minute, consider rate limited
        return times.length > 5;
    },
    // Get suggested delay for a proxy
    getSuggestedDelay(proxy) {
        if (!browser)
            return 0; // Skip on server
        if (!this.timestamps.has(proxy))
            return 0;
        const times = this.timestamps.get(proxy);
        // Add 500ms for each recent request
        return Math.min(times.length * 500, 5000);
    }
};
// Dodajemy dynamiczny import dla rss-parser tylko w przeglądarce
let Parser;
let parser;
// Custom lightweight XML parser for fallback
function parseXMLFeed(xmlText) {
    log('Using custom XML parser fallback');
    try {
        // Simple DOM parser approach
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        // Extract feed title
        const title = xmlDoc.querySelector('channel > title')?.textContent ||
            xmlDoc.querySelector('feed > title')?.textContent ||
            'Unknown Feed';
        // Extract items
        const itemNodes = xmlDoc.querySelectorAll('item, entry');
        const items = [];
        itemNodes.forEach((item, index) => {
            const title = item.querySelector('title')?.textContent || 'Untitled';
            const link = item.querySelector('link')?.textContent ||
                item.querySelector('link')?.getAttribute('href') || '';
            const description = item.querySelector('description')?.textContent ||
                item.querySelector('summary')?.textContent ||
                item.querySelector('content')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent ||
                item.querySelector('published')?.textContent ||
                item.querySelector('updated')?.textContent || '';
            const creator = item.querySelector('creator')?.textContent ||
                item.querySelector('author')?.textContent || '';
            // Get thumbnail/image if available
            let enclosure = null;
            const enclosureEl = item.querySelector('enclosure');
            if (enclosureEl && enclosureEl.getAttribute('url')) {
                enclosure = {
                    url: enclosureEl.getAttribute('url'),
                    type: enclosureEl.getAttribute('type'),
                    length: enclosureEl.getAttribute('length')
                };
            }
            // Add item to collection
            items.push({
                title,
                link,
                description,
                contentSnippet: description?.substring(0, 200),
                pubDate,
                creator,
                author: creator,
                enclosure
            });
        });
        return {
            title,
            items
        };
    }
    catch (error) {
        logError('Custom XML parser failed', error);
        return { title: 'Failed Parsing', items: [] };
    }
}
// Inicjalizacja parsera tylko po stronie klienta
async function initParser() {
    if (browser) {
        try {
            log('Importing RSS parser module...');
            // Skip complex patching that causes TypeScript errors
            // Just continue with import and handle errors during use
            const module = await import('rss-parser');
            // Handle different module formats
            Parser = module.default || module;
            log('Parser module imported, attempting to create instance');
            try {
                // Create parser with minimal config to avoid errors
                parser = new Parser({
                    timeout: 10000,
                    headers: {
                        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml'
                    }
                });
                // Check if parser was successfully created
                if (parser) {
                    log('RSS Parser initialized successfully with minimal config');
                    return true;
                }
                else {
                    log('Parser creation returned null or undefined');
                    return false;
                }
            }
            catch (parserError) {
                logError('Error creating parser instance', parserError);
                log('Will use custom XML parser instead');
                // Signal we'll use our custom parser
                parser = null;
                return false;
            }
        }
        catch (error) {
            logError('Failed to initialize RSS parser', error);
            return false;
        }
    }
    return false;
}
// Modified to work with our custom parser when needed
async function parseRSSFeed(feedText, sourceId) {
    if (!feedText || feedText.trim() === '') {
        return { items: [] };
    }
    try {
        // If we have the RSS parser library loaded, use it
        if (parser) {
            log(`Parsing feed with RSS Parser for ${sourceId}`);
            return await parser.parseString(feedText);
        }
        // Otherwise fall back to our custom parser
        else {
            log(`Using custom XML parser for ${sourceId}`);
            return parseXMLFeed(feedText);
        }
    }
    catch (error) {
        logError(`Error parsing feed for ${sourceId}`, error);
        // Last resort fallback to our custom parser even if we initially tried the library
        try {
            return parseXMLFeed(feedText);
        }
        catch {
            return { items: [] };
        }
    }
}
// Logging helper for better debugging
function log(message, data) {
    if (data) {
        console.log(`[NewsService] ${message}`, data);
    }
    else {
        console.log(`[NewsService] ${message}`);
    }
}
// Error logging helper
function logError(message, error) {
    console.error(`[NewsService] ERROR: ${message}`, error);
}
// Try different proxies until one works
async function fetchWithCorsProxy(url) {
    // First try direct fetch (some RSS feeds allow CORS)
    try {
        log(`Attempting direct fetch for: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
                'User-Agent': 'Mozilla/5.0 (compatible; NewsApp/1.0)'
            },
            mode: 'cors', // Explicitly request CORS mode
            cache: 'no-cache'
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            const text = await response.text();
            if (text && text.trim() !== '') {
                log(`Direct fetch successful for ${url} (${text.length} bytes)`);
                return text;
            }
            log(`Direct fetch returned empty response for ${url}`);
        }
        else {
            log(`Direct fetch failed with status ${response.status} for ${url}`);
        }
    }
    catch (error) {
        log(`Direct fetch failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    // Try our custom internal CORS proxy first
    try {
        const proxyUrl = `/api/cors-proxy?url=${encodeURIComponent(url)}`;
        // Check if this proxy is rate limited
        if (proxyUsage.isRateLimited(proxyUrl)) {
            log(`Internal CORS proxy appears rate limited, adding delay`);
            await new Promise(resolve => setTimeout(resolve, proxyUsage.getSuggestedDelay(proxyUrl)));
        }
        log(`Trying internal CORS proxy for: ${url}`);
        proxyUsage.logUse(proxyUrl);
        const response = await fetch(proxyUrl, {
            cache: 'no-cache'
        });
        if (response.ok) {
            const text = await response.text();
            if (text && text.trim() !== '') {
                log(`Internal CORS proxy successful for ${url} (${text.length} bytes)`);
                return text;
            }
            log(`Internal CORS proxy returned empty response for ${url}`);
        }
        else {
            log(`Internal CORS proxy failed with status ${response.status} for ${url}`);
        }
    }
    catch (error) {
        logError(`Internal CORS proxy failed for ${url}`, error);
    }
    // Try with external CORS proxies as fallback
    let lastError = null;
    // Shuffle proxies to avoid overusing the same ones
    const shuffledProxies = [...CORS_PROXIES].sort(() => Math.random() - 0.5);
    for (const proxy of shuffledProxies) {
        try {
            const proxyUrl = proxy + encodeURIComponent(url);
            // Check if this proxy is rate limited
            if (proxyUsage.isRateLimited(proxy)) {
                log(`Proxy ${proxy} appears rate limited, adding delay`);
                await new Promise(resolve => setTimeout(resolve, proxyUsage.getSuggestedDelay(proxy)));
            }
            log(`Trying external proxy: ${proxy} for URL: ${url}`);
            proxyUsage.logUse(proxy);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
                    'User-Agent': 'Mozilla/5.0 (compatible; NewsApp/1.0)'
                },
                cache: 'no-cache'
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                log(`External proxy ${proxy} returned status ${response.status} for ${url}`);
                continue;
            }
            const text = await response.text();
            if (!text || text.trim() === '') {
                log(`External proxy ${proxy} returned empty response for ${url}`);
                continue;
            }
            log(`Successfully fetched via external proxy ${proxy}: ${text.substring(0, 150)}...`);
            return text;
        }
        catch (error) {
            logError(`External proxy ${proxy} failed:`, error);
            lastError = error;
            // Add a small delay before trying next proxy to avoid rapid failing
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    throw lastError || new Error('All proxies failed to fetch the URL');
}
// Implementacja pobierania wiadomości ze źródła
export async function fetchNewsFromSource(sourceId) {
    try {
        if (!browser) {
            log(`[Server] Skipping fetchNewsFromSource for ${sourceId}`);
            return []; // Zwracamy pustą tablicę na serwerze
        }
        log(`Fetching news for source: ${sourceId}`);
        // Hard block of Nature domination - return just one item if it's Nature
        const isNatureSource = sourceId.toLowerCase().includes('nature');
        // Inicjalizacja parsera jeśli jeszcze nie został zainicjalizowany
        let parserAvailable = !!parser;
        if (!parserAvailable) {
            log('Parser not initialized, initializing now...');
            parserAvailable = await initParser();
            log(`Parser initialization ${parserAvailable ? 'succeeded' : 'failed'}`);
        }
        const source = newsSources.find((s) => s.id === sourceId);
        if (!source) {
            logError(`News source ${sourceId} not found`, new Error('Source not found'));
            throw new Error(`News source with ID ${sourceId} not found`);
        }
        try {
            // Fetch from source
            log(`Attempting to fetch from source: ${source.url}`);
            const feedText = await fetchWithCorsProxy(source.url);
            if (!feedText || feedText.trim() === '') {
                logError(`Empty feed for ${sourceId}`, new Error('Empty feed'));
                return [];
            }
            log(`Received feed for ${sourceId} (${feedText.length} bytes)`);
            // Parse the RSS feed
            log(`Attempting to parse feed for ${sourceId} using ${parserAvailable ? 'rss-parser' : 'custom XML parser'}`);
            let feed;
            // Try parsing with the appropriate method
            try {
                // Use rss-parser if available
                if (parserAvailable && parser) {
                    try {
                        feed = await parser.parseString(feedText);
                    }
                    catch (rssParserError) {
                        logError(`RSS parser failed for ${sourceId}, falling back to custom parser`, rssParserError);
                        feed = parseXMLFeed(feedText);
                    }
                }
                else {
                    // Use our custom XML parser
                    feed = parseXMLFeed(feedText);
                }
                if (!feed) {
                    logError(`Null feed returned for ${sourceId}`, new Error('Null feed'));
                    return [];
                }
                log(`Feed parsed successfully for ${sourceId}, structure:`, {
                    hasItems: !!feed.items,
                    itemCount: feed.items?.length || 0,
                    title: feed.title,
                    feedKeys: Object.keys(feed)
                });
                if (!feed.items || !Array.isArray(feed.items) || feed.items.length === 0) {
                    log(`No items in feed for ${sourceId}`);
                    return [];
                }
            }
            catch (parseError) {
                logError(`Failed to parse feed for ${sourceId}`, parseError);
                return [];
            }
            log(`Successfully fetched ${feed.items.length} items from ${sourceId}`);
            let processedItems = processFeedItems(feed, source, sourceId);
            // Special handling for Nature to prevent domination:
            // Only return a single item if it's from Nature
            if (isNatureSource && processedItems.length > 0) {
                processedItems = [processedItems[0]];
                log(`Applied Nature filter: limiting to just 1 item for ${sourceId}`);
            }
            log(`Processed ${processedItems.length} items from ${sourceId}`);
            return processedItems;
        }
        catch (fetchError) {
            logError(`Error fetching/parsing for ${sourceId}`, fetchError);
            return [];
        }
    }
    catch (error) {
        logError(`Error fetching news from ${sourceId}`, error);
        return [];
    }
}
// Helper to process feed items
function processFeedItems(feed, source, sourceId) {
    if (!feed || !feed.items || feed.items.length === 0) {
        console.log(`No items found in feed for ${sourceId}`);
        return [];
    }
    try {
        const items = feed.items.map((item, index) => {
            if (!item) {
                console.log(`Skipping undefined item at index ${index} for ${sourceId}`);
                return null;
            }
            // Extract image URL from media content if available
            let imageUrl;
            if (item.media && item.media.$ && item.media.$.url) {
                imageUrl = item.media.$.url;
            }
            else if (item.thumbnail && item.thumbnail.$ && item.thumbnail.$.url) {
                imageUrl = item.thumbnail.$.url;
            }
            else if (item.enclosure && item.enclosure.url) {
                imageUrl = item.enclosure.url;
            }
            // Special processing for Hacker News
            let title = item.title || 'Untitled';
            let summary = '';
            let url = item.link || '';
            if (sourceId === 'techmeme') {
                // Clean up Hacker News title
                if (title.includes('URL:')) {
                    title = title.split('URL:')[0].trim();
                }
                // Extract the actual summary content
                const description = item.description || item.content || '';
                // Remove HTML tags
                const plainText = description.replace(/<[^>]*>/g, ' ')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                // Remove points and comments info
                summary = plainText.replace(/Points: \d+/g, '')
                    .replace(/# Comments: \d+/g, '')
                    .replace(/Article URL:[^\n]+/g, '')
                    .replace(/Comments URL:[^\n]+/g, '')
                    .trim();
                // If summary is too short, provide a generic one
                if (summary.length < 30) {
                    summary = "View the full article on Hacker News for more details.";
                }
                // Extract URL from description if available (more reliable)
                const urlMatch = description.match(/Article URL: <a[^>]*href=["']([^"']+)["']/i);
                if (urlMatch && urlMatch[1]) {
                    url = urlMatch[1];
                }
            }
            else {
                // Standard processing for other sources
                summary = item.contentSnippet ||
                    item.description ||
                    item.content ||
                    item.contentEncoded ||
                    '';
                // Clean up HTML tags
                summary = summary.replace(/<[^>]*>/g, ' ')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
            }
            return {
                id: `${sourceId}-${index}-${Date.now()}`,
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
        }).filter(Boolean); // Remove any null items
        console.log(`Mapped ${items.length} valid items from ${sourceId}`);
        return items;
    }
    catch (error) {
        console.error(`Error processing feed items for ${sourceId}:`, error);
        return [];
    }
}
// Generates mock data for testing purposes
function generateMockNewsItems(sourceId, count = 5) {
    console.log(`Generating ${count} mock items for ${sourceId}`);
    const source = newsSources.find((s) => s.id === sourceId);
    if (!source)
        return [];
    const mockItems = [];
    const topics = [
        'Svelte new features', 'TypeScript 5.0', 'Web Components',
        'CSS Grid improvements', 'JavaScript Performance', 'Web Security',
        'Node.js updates', 'WebAssembly', 'Progressive Web Apps'
    ];
    for (let i = 0; i < count; i++) {
        const id = `${sourceId}-mock-${i}-${Date.now()}`;
        const topicIndex = Math.floor(Math.random() * topics.length);
        mockItems.push({
            id,
            title: `${topics[topicIndex]} - Mock Item ${i + 1} from ${source.name}`,
            summary: `This is a mock news item for ${topics[topicIndex]} created because the real RSS feed could not be fetched. It's for testing purposes only.`,
            url: 'https://example.com/' + id,
            publishDate: new Date(Date.now() - i * 3600000), // Each item 1 hour apart
            source: source.name,
            sourceId: source.id,
            category: source.category,
            imageUrl: `https://picsum.photos/seed/${id}/600/400`,
            author: 'Mock Generator',
        });
    }
    return mockItems;
}
// Implementacja pobierania wszystkich wiadomości
export async function fetchAllNews() {
    try {
        // Na serwerze zwracamy puste dane
        if (!browser) {
            log('Server-side call, returning empty data');
            return {
                items: [],
                lastUpdated: new Date(),
            };
        }
        log('Fetching news from all sources...');
        // Create promises but handle individual failures
        const promiseResults = await Promise.allSettled(newsSources.map(source => fetchNewsFromSource(source.id)));
        // Process results, keeping only successful fetches
        const successfulResults = promiseResults
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value);
        // Log failed sources
        promiseResults
            .filter((result) => result.status === 'rejected')
            .forEach((result, index) => {
            logError(`Source ${newsSources[index]?.id || 'unknown'} failed`, result.reason);
        });
        // Group items by source for better distribution
        const itemsBySource = new Map();
        // First, organize all items by source
        successfulResults.forEach(items => {
            if (!items.length)
                return;
            const sourceId = items[0].sourceId;
            if (!itemsBySource.has(sourceId)) {
                itemsBySource.set(sourceId, []);
            }
            itemsBySource.get(sourceId)?.push(...items);
        });
        // Apply source limits - max 3 items per source by default
        const MAX_ITEMS_PER_SOURCE = 2; // Reduced to 2 maximum
        const STRICT_LIMIT_FOR_NATURE = 1; // Strict limit for Nature source
        const balancedItems = [];
        // First pass: Collect one item from each source to ensure diversity
        const sourcesProcessed = new Set();
        const remainingItemsBySource = new Map();
        itemsBySource.forEach((items, sourceId) => {
            // Sort items by date (newest first)
            const sortedItems = [...items].sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());
            // Special handling for Nature - strict limit to prevent domination
            const sourceLimit = sourceId.toLowerCase().includes('nature') ?
                STRICT_LIMIT_FOR_NATURE : MAX_ITEMS_PER_SOURCE;
            // Take just one item from each source initially
            if (sortedItems.length > 0) {
                balancedItems.push(sortedItems[0]);
                sourcesProcessed.add(sourceId);
                // Store remaining items for second pass
                if (sortedItems.length > 1 && sourceLimit > 1) {
                    remainingItemsBySource.set(sourceId, sortedItems.slice(1));
                }
            }
        });
        // Second pass: Add additional items only if we have space and the source isn't Nature
        remainingItemsBySource.forEach((items, sourceId) => {
            // Skip Nature - we only want one article from Nature total
            if (sourceId.toLowerCase().includes('nature'))
                return;
            // Add up to MAX_ITEMS_PER_SOURCE-1 more items (we already took 1)
            const remainingLimit = MAX_ITEMS_PER_SOURCE - 1;
            balancedItems.push(...items.slice(0, remainingLimit));
        });
        // Check if we got any real items
        if (balancedItems.length === 0) {
            log('No news items found, using fallback data');
            // Generate some mock items for each source
            const mockItems = newsSources.map(source => generateMockNewsItems(source.id, 2) // Reduced count for better balance
            ).flat();
            // Retry initialization before giving up
            if (!parser) {
                log('Trying to re-initialize parser before falling back to mock data');
                await initParser();
            }
            log('Returning mock data as fallback');
            return {
                items: mockItems,
                lastUpdated: new Date(),
                isMock: true
            };
        }
        // Sort the balanced items by date, then by priority
        const sortedItems = balancedItems.sort((a, b) => {
            // First sort by date
            const dateComparison = b.publishDate.getTime() - a.publishDate.getTime();
            // If dates are the same, then sort by source priority
            if (dateComparison === 0) {
                const sourceA = newsSources.find((s) => s.id === a.sourceId);
                const sourceB = newsSources.find((s) => s.id === b.sourceId);
                const priorityA = sourceA ? sourceA.priority : 0;
                const priorityB = sourceB ? sourceB.priority : 0;
                return priorityB - priorityA; // Higher priority first
            }
            return dateComparison;
        });
        log(`Returning ${sortedItems.length} balanced news items`);
        return {
            items: sortedItems,
            lastUpdated: new Date(),
            isMock: false
        };
    }
    catch (error) {
        logError('Error fetching all news', error);
        // Return mock data in case of error
        const mockItems = newsSources.map(source => generateMockNewsItems(source.id, 1) // One item per source for balance
        ).flat();
        return {
            items: mockItems,
            lastUpdated: new Date(),
            isMock: true
        };
    }
}
// Implementacja pobierania wiadomości według kategorii
export async function fetchNewsByCategory(category) {
    try {
        // Na serwerze zwracamy puste dane
        if (!browser) {
            log(`Server-side call for category ${category}, returning empty data`);
            return {
                items: [],
                lastUpdated: new Date(),
            };
        }
        log(`Fetching news for category: ${category}`);
        const relevantSources = newsSources.filter((source) => source.category === category);
        if (relevantSources.length === 0) {
            log(`No sources found for category: ${category}`);
            return {
                items: [],
                lastUpdated: new Date(),
                isMock: true
            };
        }
        // Create promises but handle individual failures
        const promiseResults = await Promise.allSettled(relevantSources.map(source => fetchNewsFromSource(source.id)));
        // Process results, keeping only successful fetches
        const successfulResults = promiseResults
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value);
        // Log failed sources
        promiseResults
            .filter((result) => result.status === 'rejected')
            .forEach((result, index) => {
            logError(`Source ${relevantSources[index]?.id || 'unknown'} failed for category ${category}`, result.reason);
        });
        // Group items by source for better distribution
        const itemsBySource = new Map();
        // First, organize all items by source
        successfulResults.forEach(items => {
            if (!items.length)
                return;
            const sourceId = items[0].sourceId;
            if (!itemsBySource.has(sourceId)) {
                itemsBySource.set(sourceId, []);
            }
            itemsBySource.get(sourceId)?.push(...items);
        });
        // Apply source limits with stricter rules for Nature
        const MAX_ITEMS_PER_SOURCE = relevantSources.length < 3 ? 3 : 2;
        const STRICT_LIMIT_FOR_NATURE = 1; // Strict limit for Nature in any category
        const balancedItems = [];
        // First pass: Collect one item from each source to ensure diversity
        const sourcesProcessed = new Set();
        const remainingItemsBySource = new Map();
        itemsBySource.forEach((items, sourceId) => {
            // Sort items by date (newest first)
            const sortedItems = [...items].sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());
            // Special handling for Nature - strict limit to prevent domination
            const sourceLimit = sourceId.toLowerCase().includes('nature') ?
                STRICT_LIMIT_FOR_NATURE : MAX_ITEMS_PER_SOURCE;
            // Take just one item from each source initially
            if (sortedItems.length > 0) {
                balancedItems.push(sortedItems[0]);
                sourcesProcessed.add(sourceId);
                // Store remaining items for second pass
                if (sortedItems.length > 1 && sourceLimit > 1) {
                    remainingItemsBySource.set(sourceId, sortedItems.slice(1));
                }
            }
        });
        // Second pass: Add additional items only if we have space and the source isn't Nature
        remainingItemsBySource.forEach((items, sourceId) => {
            // Skip Nature - we only want one article from Nature total
            if (sourceId.toLowerCase().includes('nature'))
                return;
            // For other sources, add up to sourceLimit-1 more items (we already took 1)
            const remainingLimit = MAX_ITEMS_PER_SOURCE - 1;
            balancedItems.push(...items.slice(0, remainingLimit));
        });
        // Check if we got any real items
        if (balancedItems.length === 0) {
            log(`No news items found for category ${category}, using fallback data`);
            // Generate some mock items for each source in this category
            const mockItems = relevantSources.map(source => generateMockNewsItems(source.id, 2)).flat();
            return {
                items: mockItems,
                lastUpdated: new Date(),
                isMock: true
            };
        }
        // Sort the balanced items
        const sortedItems = balancedItems.sort((a, b) => {
            // First sort by date
            const dateComparison = b.publishDate.getTime() - a.publishDate.getTime();
            // If dates are the same, then sort by source priority
            if (dateComparison === 0) {
                const sourceA = newsSources.find((s) => s.id === a.sourceId);
                const sourceB = newsSources.find((s) => s.id === b.sourceId);
                const priorityA = sourceA ? sourceA.priority : 0;
                const priorityB = sourceB ? sourceB.priority : 0;
                return priorityB - priorityA; // Higher priority first
            }
            return dateComparison;
        });
        log(`Returning ${sortedItems.length} balanced news items for category ${category}`);
        return {
            items: sortedItems,
            lastUpdated: new Date(),
            isMock: false
        };
    }
    catch (error) {
        logError(`Error fetching news for category ${category}`, error);
        // Return mock data for this category
        const relevantSources = newsSources.filter((source) => source.category === category);
        const mockItems = relevantSources.map(source => generateMockNewsItems(source.id, 1) // One item per source for balance
        ).flat();
        return {
            items: mockItems,
            lastUpdated: new Date(),
            isMock: true
        };
    }
}
export function getCategoryName(categoryId) {
    return newsCategories[categoryId] || categoryId;
}
export function getAvailableCategories() {
    return Object.entries(newsCategories).map(([id, name]) => ({
        id,
        name
    }));
}
