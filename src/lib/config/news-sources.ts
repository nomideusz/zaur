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
  {
    id: 'hackernews',
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/rss',
    type: 'rss',
    category: 'tech',
    priority: 10
  },
  {
    id: 'devto',
    name: 'DEV.to',
    url: 'https://dev.to/feed/',
    type: 'rss',
    category: 'programming',
    priority: 8
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    url: 'https://www.producthunt.com/feed',
    type: 'rss',
    category: 'products',
    priority: 7
  },
  {
    id: 'wired',
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    type: 'rss', 
    category: 'tech',
    priority: 6
  },
  {
    id: 'techmeme',
    name: 'Techmeme',
    url: 'https://www.techmeme.com/feed.xml',
    type: 'rss',
    category: 'tech',
    priority: 5
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