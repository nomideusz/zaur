import type { ZaurNewsItem } from './types.js';
import { decodeHtmlEntities } from './utils.js';
import { generateComment } from './commentService.js';

/**
 * Process all news items for later use
 * @param items Raw news items from API
 * @param zaurComments Map of previously saved comments
 * @returns Processed news items with Zaur's comments and UI properties
 */
export function processNewsItems(
  items: any[], 
  zaurComments: Map<string, string>
): ZaurNewsItem[] {
  // Create a set to track used comments to avoid duplicates
  const usedComments = new Set<string>();
  
  return items.map(item => {
    const category = item.category as string;
    const savedComment = zaurComments.get(item.id);
    
    // Clean up summary text - remove "Comments..." text and other noise
    let cleanSummary = item.summary;
    if (cleanSummary) {
      cleanSummary = cleanSummary
        .replace(/\bComments\.\.\.\b/g, '')
        .replace(/\bComment\.\.\.\b/g, '')
        .replace(/\bComments\b/g, '')
        .replace(/\bComment\b/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    
    // Generate a comment based on the title and category
    const comment = generateComment(item.title, category, savedComment, usedComments);
    
    return {
      ...item,
      isNew: false,
      // Use saved comment if available, otherwise get a new one
      zaurComment: comment,
      decodedTitle: decodeHtmlEntities(item.title),
      decodedSummary: decodeHtmlEntities(cleanSummary || item.summary),
      zaurMood: getRandomMood(),
      isEmphasized: false,
      // If we have a saved comment with a line break, consider it as having reacted
      hasReacted: savedComment?.includes("\n\n") || false
    };
  });
}

/**
 * Mark items as discovered in the available items array
 * @param allAvailableItems All available news items
 * @param discoveredItemIds Set of discovered item IDs
 * @param zaurComments Map of Zaur's comments
 * @param lastDiscoveredItems Array of discovered items with timestamps
 * @returns Array of marked items and updated seenItemIds set
 */
export function markDiscoveredItems(
  allAvailableItems: ZaurNewsItem[],
  discoveredItemIds: Set<string>,
  zaurComments: Map<string, string>,
  lastDiscoveredItems: { itemId: string, timestamp: string }[]
): { 
  updatedItems: ZaurNewsItem[], 
  seenItemIds: Set<string> 
} {
  if (discoveredItemIds.size === 0 || allAvailableItems.length === 0) {
    return { 
      updatedItems: [...allAvailableItems], 
      seenItemIds: new Set<string>() 
    };
  }
  
  // Create a new Set for seen items
  const seenItemIds = new Set<string>();
  
  // Create a map for quick lookup of most recent discovery time
  const discoveryTimes = new Map<string, string>();
  lastDiscoveredItems.forEach(item => {
    discoveryTimes.set(item.itemId, item.timestamp);
  });
  
  // Update all available items with discovery information
  const updatedItems = allAvailableItems.map(item => {
    // Clone the item to avoid mutating the original
    const updatedItem = { ...item };
    
    // If this item was discovered before...
    if (discoveredItemIds.has(item.id)) {
      // Add discovered item's ID to the seenItemIds set
      seenItemIds.add(item.id);
      
      // Apply any saved comment
      const savedComment = zaurComments.get(item.id);
      if (savedComment) {
        updatedItem.zaurComment = savedComment;
        updatedItem.hasReacted = savedComment.includes("\n\n") || false;
      }
      
      // If this was recently discovered (in the last 3 hours), mark it accordingly
      const discoveryTimestamp = discoveryTimes.get(item.id);
      if (discoveryTimestamp) {
        const discoveryTime = new Date(discoveryTimestamp).getTime();
        const now = new Date().getTime();
        const threeHoursInMs = 3 * 60 * 60 * 1000;
        
        if (now - discoveryTime < threeHoursInMs) {
          // This was discovered in the last 3 hours
          updatedItem.isEmphasized = true;
        }
      }
    }
    
    return updatedItem;
  });
  
  return { updatedItems, seenItemIds };
}

/**
 * Sort items with discoveries at the top
 * @param items News items to sort
 * @param lastDiscoveredItems Array of discovered items with timestamps
 * @returns Sorted array of news items
 */
export function sortWithDiscoveriesAtTop(
  items: ZaurNewsItem[],
  lastDiscoveredItems: { itemId: string, timestamp: string }[]
): ZaurNewsItem[] {
  // Create a map of discovery times for quick lookup
  const discoveryTimes = new Map<string, number>();
  lastDiscoveredItems.forEach(item => {
    discoveryTimes.set(item.itemId, new Date(item.timestamp).getTime());
  });
  
  // Clone the array to avoid mutating the original
  return [...items].sort((a, b) => {
    const aIsRecent = discoveryTimes.has(a.id);
    const bIsRecent = discoveryTimes.has(b.id);
    
    // If both are recent discoveries, sort by discovery time (newest first)
    if (aIsRecent && bIsRecent) {
      const aTime = discoveryTimes.get(a.id) || 0;
      const bTime = discoveryTimes.get(b.id) || 0;
      return bTime - aTime;
    }
    
    // If only one is a recent discovery, it comes first
    if (aIsRecent) return -1;
    if (bIsRecent) return 1;
    
    // Otherwise, sort by publish date (newest first)
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });
}

/**
 * Helper for random moods
 */
function getRandomMood(): string {
  const moods = ["curious", "excited", "thoughtful", "amused", "intrigued", "surprised"];
  return moods[Math.floor(Math.random() * moods.length)];
} 