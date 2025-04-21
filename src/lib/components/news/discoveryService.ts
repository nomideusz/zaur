import { browser } from '$app/environment';
import type { ZaurNewsItem } from './types.js';
import { getHourSeed, seededRandom } from './utils.js';
import { discoveryComments } from './commentaryData.js';
import { saveDiscoveredItem, saveZaurComment } from './apiService.js';
import { generateComment } from './commentService.js';

/**
 * Check for time-based discoveries
 * @param allAvailableItems All available news items
 * @param discoveredItemIds Set of discovered item IDs
 * @param showingDiscovery Flag indicating if discovery is currently showing
 * @returns Object with discovery flag and item if a discovery is found
 */
export function checkForTimeBasedDiscoveries(
  allAvailableItems: ZaurNewsItem[],
  discoveredItemIds: Set<string>,
  showingDiscovery: boolean
): { shouldDiscover: boolean, seed: number } {
  if (!browser) return { shouldDiscover: false, seed: 0 };
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Define fixed discovery times (at 10, 25, 40, and 55 minutes past the hour)
  const discoveryMinutes = [10, 25, 40, 55];
  
  // Check if we're in a discovery minute
  const isDiscoveryMinute = discoveryMinutes.includes(currentMinute);
  
  if (isDiscoveryMinute && !showingDiscovery && allAvailableItems.length > 0) {
    // Generate a consistent seed based on current hour and minute
    // This ensures all users will see the same discovery at the same time
    const seed = currentHour * 100 + currentMinute;
    
    return { shouldDiscover: true, seed };
  }
  
  return { shouldDiscover: false, seed: 0 };
}

/**
 * Handle the discovery of a new item
 * @param availableItems Available news items
 * @param currentItems Current displayed news items
 * @param discoveredItemIds Set of discovered item IDs
 * @param seed Seed for deterministic selection
 * @returns Object containing the new item and other info
 */
export async function discoverNewItem(
  availableItems: ZaurNewsItem[],
  currentItems: ZaurNewsItem[],
  discoveredItemIds: Set<string>,
  seed: number
): Promise<{
  newItem: ZaurNewsItem;
  oldestItemId: string | null;
  discoveredItemId: string;
}> {
  // Find the newest item's date
  const newestCurrentDate = currentItems.length > 0 
    ? Math.max(...currentItems.map(item => new Date(item.publishDate).getTime()))
    : 0;
  
  // Filter for items that are newer than our current newest
  // If we have newer items available, prioritize those
  const newerItems = availableItems.filter(item => 
    new Date(item.publishDate).getTime() > newestCurrentDate
  );
  
  let itemsToChooseFrom = newerItems.length > 0 ? newerItems : availableItems;
  
  // Filter out already discovered items
  itemsToChooseFrom = itemsToChooseFrom.filter(item => !discoveredItemIds.has(item.id));
  
  // If we have no undiscovered items, use all items but prefer ones not currently shown
  if (itemsToChooseFrom.length === 0) {
    console.log('[ZaurNews] No undiscovered items available, using all items');
    itemsToChooseFrom = availableItems.filter(item => 
      !currentItems.some(currentItem => currentItem.id === item.id)
    );
    
    // If we still have no items, use all available items
    if (itemsToChooseFrom.length === 0) {
      itemsToChooseFrom = availableItems;
    }
  }
  
  // Sort by date (newest first) to prioritize the freshest content
  itemsToChooseFrom = itemsToChooseFrom.sort((a, b) => 
    new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );
  
  // For deterministic selection, but prioritizing newer content
  // Take from the first 25% of the sorted list (the newest items)
  const availableCount = itemsToChooseFrom.length;
  const newestQuarter = Math.max(1, Math.floor(availableCount * 0.25));
  
  // Generate a pseudo-random index within the newest quarter of items
  const pseudoRandom = seededRandom(seed);
  const index = Math.floor(pseudoRandom * newestQuarter);
  
  // Select from the newest quarter
  const selectedItem = itemsToChooseFrom[index];
  
  // Also select a discovery comment deterministically
  const commentIndex = Math.floor(seededRandom(seed + 1) * discoveryComments.length);
  
  const category = selectedItem.category as string;
  
  // Generate a comment that's specific to this article's content
  const zaurComment = generateComment(selectedItem.title, category, null);
  
  const newItem: ZaurNewsItem = { 
    ...selectedItem,
    isNew: true,
    justDiscovered: true,
    discoveryComment: discoveryComments[commentIndex],
    // If we couldn't find newer content, make it appear slightly newer
    publishDate: newerItems.length > 0 
      ? selectedItem.publishDate 
      : new Date(newestCurrentDate + 60000).toISOString(),
    // Ensure decoded content is available
    decodedTitle: selectedItem.decodedTitle || selectedItem.title,
    decodedSummary: selectedItem.decodedSummary || selectedItem.summary,
    // Add Zaur's commentary
    zaurComment,
    zaurMood: "excited", // Zaur is excited about new discoveries
    isEmphasized: true  // Emphasize new discoveries automatically
  };
  
  // Save to server with initial comment
  await saveDiscoveredItem(newItem.id);
  
  // Also save Zaur's comment if available
  if (zaurComment) {
    await saveZaurComment(newItem.id, zaurComment);
  }
  
  // Don't need to remove any old items since we're keeping all discovered items
  const oldestItemId = null;
  
  return {
    newItem,
    oldestItemId,
    discoveredItemId: newItem.id
  };
} 