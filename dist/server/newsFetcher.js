// @ts-nocheck
const dev = process.env.NODE_ENV !== 'production';
import { updateNews } from './newsStoreInit.js';

// List of categories we support
const CATEGORIES = ['dev', 'ai', 'crypto', 'productivity', 'tools', 'philosophy'];

// Mapping of our categories to search terms
const CATEGORY_SEARCH_TERMS = {
  dev: 'software development',
  ai: 'artificial intelligence',
  crypto: 'cryptocurrency',
  productivity: 'productivity tools',
  tools: 'developer tools',
  philosophy: 'tech philosophy'
};

/**
 * Fetch news from external API and update the in-memory store
 */
export async function fetchRealNews() {
  console.log('Fetching real news...');
  
  const allNewsItems = [];
  
  // Fetch news for each category
  for (const category of CATEGORIES) {
    try {
      const newsItems = await fetchNewsForCategory(category);
      allNewsItems.push(...newsItems);
    } catch (error) {
      console.error(`Error fetching news for category ${category}:`, error);
    }
  }
  
  // Update the in-memory store with the fetched news
  if (allNewsItems.length > 0) {
    console.log(`Updating in-memory store with ${allNewsItems.length} real news items`);
    updateNews(allNewsItems);
    return allNewsItems.length;
  }
  
  console.log('No real news items were fetched');
  return 0;
}

/**
 * Fetch news for a specific category
 */
async function fetchNewsForCategory(category) {
  const searchTerm = CATEGORY_SEARCH_TERMS[category] || category;
  
  try {
    // Try different news API approaches
    
    // 1. First try: Using a public news API that doesn't require an API key
    try {
      console.log(`Fetching news for '${category}' from public API...`);
      const publicUrl = `https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(searchTerm)}&language=en&limit=5`;
      
      const publicResponse = await fetch(publicUrl, {
        headers: {
          'Authorization': '9IcvEzy6fOd_z0SD8GVuUVm7gbF1XbUiPu7G9QQzCoVtlrQB' // Public test key
        }
      });
      
      if (publicResponse.ok) {
        const data = await publicResponse.json();
        if (data.news && Array.isArray(data.news) && data.news.length > 0) {
          console.log(`✓ Got ${data.news.length} articles for '${category}' from public API`);
          return data.news.map((article, index) => ({
            id: `${category}-${Date.now()}-${index}`,
            title: article.title,
            summary: article.description,
            url: article.url,
            publishDate: article.published || new Date().toISOString(),
            source: article.source || 'News Source',
            sourceId: article.source?.toLowerCase().replace(/\s+/g, '-') || 'news',
            category,
            imageUrl: article.image || `https://picsum.photos/seed/${category}${index}/600/400`,
            author: article.author || article.source || 'News Source'
          }));
        }
      }
    } catch (publicError) {
      console.error(`Error with public API for ${category}:`, publicError);
    }
    
    // 2. Fallback: Try with GNews API (if available)
    console.log(`Trying GNews API for '${category}'...`);
    const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(searchTerm)}&lang=en&max=5&apikey=${process.env.GNEWS_API_KEY || 'demo'}`;
    
    // Use public CORS proxy if in development mode
    const fetchUrl = dev ? `https://api.allorigins.win/get?url=${encodeURIComponent(gnewsUrl)}` : gnewsUrl;
    
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      throw new Error(`GNews API responded with status: ${response.status}`);
    }
    
    let data;
    if (dev) {
      // Parse the response from the CORS proxy
      const proxyData = await response.json();
      data = JSON.parse(proxyData.contents);
    } else {
      data = await response.json();
    }
    
    // Map the API response to our news item format
    if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
      console.log(`✓ Got ${data.articles.length} articles for '${category}' from GNews API`);
      return data.articles.map((article, index) => ({
        id: `${category}-${Date.now()}-${index}`,
        title: article.title,
        summary: article.description,
        url: article.url,
        publishDate: article.publishedAt || new Date().toISOString(),
        source: article.source?.name || 'News Source',
        sourceId: article.source?.name?.toLowerCase().replace(/\s+/g, '-') || 'news',
        category,
        imageUrl: article.image || `https://picsum.photos/seed/${category}${index}/600/400`,
        author: article.source?.name || 'News Source'
      }));
    }
    
    // 3. Generate synthetic news as last resort
    console.log(`Generating synthetic news for '${category}'...`);
    return generateSyntheticNews(category, 3);
    
  } catch (error) {
    console.error(`Error fetching news for category ${category}:`, error);
    return generateSyntheticNews(category, 2); // Generate synthetic news as fallback
  }
}

/**
 * Generate synthetic news items when APIs fail
 */
function generateSyntheticNews(category, count = 3) {
  console.log(`Generating ${count} synthetic news items for ${category}`);
  const categoryTitle = CATEGORY_SEARCH_TERMS[category] || category;
  const now = new Date();
  
  const headlines = {
    'dev': [
      'New Framework Released for Web Development',
      'TypeScript 5.0 Features That Will Change How You Code',
      'The Future of Frontend Development',
      'Backend Development Trends for 2023'
    ],
    'ai': [
      'Breakthrough in AI Image Generation',
      'How Machine Learning is Transforming Healthcare',
      'The Ethics of AI: New Guidelines Released',
      'Neural Networks That Can Explain Their Decisions'
    ],
    'crypto': [
      'Major Changes Coming to Ethereum',
      'Bitcoin Adoption Growing in Developing Nations',
      'NFTs Enter a New Era with Practical Applications',
      'Web3 Development Tools Getting More Accessible'
    ],
    'productivity': [
      'Research Shows Benefits of 4-Day Work Week',
      'New Productivity Approach Gaining Popularity',
      'How to Structure Your Day for Maximum Output',
      'Tools That Are Changing How Teams Collaborate'
    ],
    'tools': [
      'VS Code Extensions Every Developer Should Have',
      'Open Source Alternatives to Popular Development Tools',
      'New CLI Tool Simplifies Deployment Process',
      'Browser DevTools Features You Might Have Missed'
    ],
    'philosophy': [
      'Tech Ethics: Balancing Progress and Responsibility',
      'Minimalism in Software Design',
      'The Psychology of User Experience',
      'Why Open Source Matters More Than Ever'
    ]
  };
  
  const defaultHeadlines = [
    `Latest Trends in ${categoryTitle}`,
    `What's New in ${categoryTitle}`,
    `The Future of ${categoryTitle}`,
    `Essential ${categoryTitle} Updates`
  ];
  
  const categoryHeadlines = headlines[category] || defaultHeadlines;
  
  return Array.from({ length: count }).map((_, index) => {
    const headlineIndex = Math.floor(Math.random() * categoryHeadlines.length);
    const daysAgo = index * 0.5; // Space them out by half days
    
    return {
      id: `synthetic-${category}-${Date.now()}-${index}`,
      title: categoryHeadlines[headlineIndex],
      summary: `This is a generated summary about ${categoryTitle.toLowerCase()} topics. Since we couldn't fetch real news, this placeholder ensures you still have content to view.`,
      url: `https://zaur.app/news/${category}`,
      publishDate: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
      source: 'Zaur News Generator',
      sourceId: 'zaur-generated',
      category,
      imageUrl: `https://picsum.photos/seed/${category}${index}/600/400`,
      author: 'Zaur AI Assistant'
    };
  });
}

/**
 * Use an alternative free news API as fallback
 */
async function fetchAlternativeNews(category) {
  const searchTerm = CATEGORY_SEARCH_TERMS[category] || category;
  
  try {
    // Use NewsData.io as fallback
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY || 'pub_34356c0a3d4124061cae23169b2e021ea2362'}&q=${encodeURIComponent(searchTerm)}&language=en`;
    
    // Use public CORS proxy if in development mode
    const fetchUrl = dev ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}` : url;
    
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      throw new Error(`Alternative news API responded with status: ${response.status}`);
    }
    
    let data;
    if (dev) {
      // Parse the response from the CORS proxy
      const proxyData = await response.json();
      data = JSON.parse(proxyData.contents);
    } else {
      data = await response.json();
    }
    
    // Map the API response to our news item format
    if (data.results && Array.isArray(data.results)) {
      return data.results.slice(0, 5).map((article, index) => ({
        id: `${category}-${Date.now()}-${index}`,
        title: article.title,
        summary: article.description || article.content,
        url: article.link,
        publishDate: article.pubDate || new Date().toISOString(),
        source: article.source_id || 'News Source',
        sourceId: article.source_id?.toLowerCase().replace(/\s+/g, '-') || 'news',
        category,
        imageUrl: article.image_url || `https://picsum.photos/seed/${category}${index}/600/400`,
        author: article.creator?.[0] || article.source_id || 'News Source'
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching alternative news for category ${category}:`, error);
    return [];
  }
} 