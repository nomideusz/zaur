declare module 'xml2js' {
  export function parseStringPromise(xml: string, options?: any): Promise<any>;
}

// If the NewsItem type in newsStore.js has imageUrl as string | undefined
// but in fetchRssFeeds.js it's string | null
interface NewsItemBase {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishDate: string;
  source: string;
  sourceId: string;
  category: string;
  author: string;
}

// Override for newsStore.js
declare module '$lib/server/newsStore.js' {
  export interface StoreNewsItem extends NewsItemBase {
    imageUrl?: string;
  }
} 