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
    id: 'webdevelopernews',
    name: 'Web Developer News',
    url: 'https://feeds.feedburner.com/webdevelopertrends',
    type: 'rss',
    category: 'programming',
    priority: 10
  },
  {
    id: 'techmeme',
    name: 'Techmeme',
    url: 'https://feeds.feedburner.com/techmeme',
    type: 'rss',
    category: 'tech',
    priority: 9
  },
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
  {
    id: 'dzone',
    name: 'DZone',
    url: 'https://feeds.dzone.com/webdev',
    type: 'rss',
    category: 'programming',
    priority: 6
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