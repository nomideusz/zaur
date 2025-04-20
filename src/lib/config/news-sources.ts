export interface NewsSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'api';
  category: string;
  priority: number;
}

// Lista źródeł wiadomości do pobierania
export const newsSources: NewsSource[] = [
  // Programming sources
  {
    id: 'webdevelopernews',
    name: 'Web Developer News',
    url: 'https://dev.to/feed/tag/webdev',
    type: 'rss',
    category: 'programming',
    priority: 10
  },
  {
    id: 'javascriptweekly',
    name: 'JavaScript Weekly',
    url: 'https://javascriptweekly.com/rss',
    type: 'rss',
    category: 'programming',
    priority: 8
  },
  {
    id: 'reactblog',
    name: 'React Blog',
    url: 'https://reactjs.org/feed.xml',
    type: 'rss',
    category: 'programming',
    priority: 7
  },
  {
    id: 'redditprogramming',
    name: 'Reddit Programming',
    url: 'https://www.reddit.com/r/programming/.rss',
    type: 'rss',
    category: 'programming',
    priority: 6
  },
  
  // Tech sources
  {
    id: 'techmeme',
    name: 'Hacker News',
    url: 'https://hnrss.org/newest?count=15',
    type: 'rss',
    category: 'tech',
    priority: 9
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    type: 'rss',
    category: 'tech',
    priority: 8
  },
  
  // Design sources
  {
    id: 'smashingmagazine',
    name: 'Smashing Magazine',
    url: 'https://www.smashingmagazine.com/feed/',
    type: 'rss',
    category: 'design',
    priority: 8
  },
  {
    id: 'css-tricks',
    name: 'CSS-Tricks',
    url: 'https://css-tricks.com/feed/',
    type: 'rss',
    category: 'design',
    priority: 7
  },
  
  // Products sources
  {
    id: 'producthunt',
    name: 'Product Hunt',
    url: 'https://www.producthunt.com/feed',
    type: 'rss',
    category: 'products',
    priority: 9
  },
  {
    id: 'betalist',
    name: 'BetaList',
    url: 'https://betalist.com/feed',
    type: 'rss',
    category: 'products',
    priority: 8
  },
  
  // Business sources
  {
    id: 'forbes',
    name: 'Forbes',
    url: 'https://www.forbes.com/business/feed/',
    type: 'rss',
    category: 'business',
    priority: 9
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    url: 'https://www.entrepreneur.com/latest.rss',
    type: 'rss',
    category: 'business',
    priority: 8
  },
  {
    id: 'fastcompany',
    name: 'Fast Company',
    url: 'https://www.fastcompany.com/feed',
    type: 'rss',
    category: 'business',
    priority: 7
  },
  
  // Science sources
  {
    id: 'sciencedaily',
    name: 'Science Daily',
    url: 'https://www.sciencedaily.com/rss/all.xml',
    type: 'rss',
    category: 'science',
    priority: 9
  },
  {
    id: 'nature',
    name: 'Nature',
    url: 'https://www.nature.com/nature.rss',
    type: 'rss',
    category: 'science',
    priority: 10
  },
  {
    id: 'scientificamerican',
    name: 'Scientific American',
    url: 'https://rss.sciam.com/ScientificAmerican-Global',
    type: 'rss', 
    category: 'science',
    priority: 8
  }
];

// Kategorie wiadomości
export const newsCategories = {
  tech: 'Technology',
  programming: 'Programming',
  products: 'Products',
  design: 'Design',
  business: 'Business',
  science: 'Science'
}; 