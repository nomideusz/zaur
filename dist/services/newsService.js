import { browser } from '$app/environment';
// Log messages to console
function log(message, data) {
    if (data) {
        console.log(`[ZaurNews] ${message}`, data);
    }
    else {
        console.log(`[ZaurNews] ${message}`);
    }
}
// Log errors to console
function logError(message, error) {
    console.error(`[ZaurNews] ERROR: ${message}`, error);
}
/**
 * Fetch all news from the local API
 * @returns {Promise<NewsResponse>} The news response
 */
export async function fetchAllNews() {
    if (!browser) {
        log('Server-side call, returning empty data', null);
        return {
            items: [],
            lastUpdated: new Date(),
        };
    }
    try {
        log('Fetching Zaur news collection...', null);
        const response = await fetch('/api/news');
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        // Ensure dates are Date objects
        const items = data.items.map((item) => ({
            ...item,
            publishDate: new Date(item.publishDate)
        }));
        log(`Fetched ${items.length} Zaur news items`, null);
        return {
            items,
            lastUpdated: new Date(data.lastUpdated),
            isMock: false
        };
    }
    catch (error) {
        logError('Error fetching Zaur news', error);
        // Generate sample items if API fails
        const mockData = generateZaurNewsItems('featured', 5);
        log(`Generated ${mockData.length} mock news items as fallback`, null);
        return {
            items: mockData,
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
export async function fetchNewsByCategory(category) {
    if (!browser) {
        log(`Server-side call for category ${category}, returning empty data`, null);
        return {
            items: [],
            lastUpdated: new Date(),
        };
    }
    try {
        log(`Fetching Zaur news for category: ${category}`, null);
        const response = await fetch(`/api/news?category=${encodeURIComponent(category)}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        // Ensure dates are Date objects
        const items = data.items.map((item) => ({
            ...item,
            publishDate: new Date(item.publishDate)
        }));
        log(`Fetched ${items.length} Zaur news items for category ${category}`, null);
        return {
            items,
            lastUpdated: new Date(data.lastUpdated),
            isMock: false
        };
    }
    catch (error) {
        logError(`Error fetching Zaur news for category ${category}`, error);
        // Generate sample items if API fails
        return {
            items: generateZaurNewsItems(category, 5),
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
        { id: 'ai', name: 'Artificial Intelligence' },
        { id: 'dev', name: 'Development' },
        { id: 'crypto', name: 'Cryptocurrency' },
        { id: 'productivity', name: 'Productivity' },
        { id: 'tools', name: 'Tools & Utilities' },
        { id: 'philosophy', name: 'Philosophy' }
    ];
}
/**
 * Generate Zaur-themed news items (fallback)
 * @param {string} category Category or sourceId
 * @param {number} count Number of items to generate
 * @returns {Array} Array of mock news items
 */
function generateZaurNewsItems(category = 'featured', count = 5) {
    log(`Generating ${count} Zaur news items for ${category}`, null);
    const mockItems = [];
    const topics = [
        'AI agents breakthrough', 'TypeScript performance tips', 'Crypto market analysis',
        'Productivity system optimization', 'Development workflow tools', 'Philosophical perspectives on technology',
        'Terminal customization', 'Web3 development', 'Minimalist software design'
    ];
    for (let i = 0; i < count; i++) {
        const id = `zaur-${category}-${i}-${Date.now()}`;
        const topicIndex = Math.floor(Math.random() * topics.length);
        const date = new Date(Date.now() - i * 3600000);
        mockItems.push({
            id,
            title: `${topics[topicIndex]} - Zaur's Picks ${i + 1}`,
            summary: `A curated insight on ${topics[topicIndex]} selected for your personalized feed.`,
            url: 'https://example.com/' + id,
            publishDate: date.toISOString(),
            source: 'Zaur Collection',
            sourceId: 'zaur',
            category: category !== 'featured' ? category : getCategoryForTopic(topics[topicIndex]),
            imageUrl: `https://picsum.photos/seed/${id}/600/400`,
            author: 'Zaur Curator',
        });
    }
    return mockItems;
}
/**
 * Map topic to appropriate category
 * @param {string} topic The topic to categorize
 * @returns {string} Category ID
 */
function getCategoryForTopic(topic) {
    if (topic.includes('AI'))
        return 'ai';
    if (topic.includes('TypeScript') || topic.includes('Web3'))
        return 'dev';
    if (topic.includes('Crypto'))
        return 'crypto';
    if (topic.includes('Productivity'))
        return 'productivity';
    if (topic.includes('tools') || topic.includes('Terminal') || topic.includes('workflow'))
        return 'tools';
    if (topic.includes('Philosophical') || topic.includes('minimalist'))
        return 'philosophy';
    return 'ai'; // Default category
}
