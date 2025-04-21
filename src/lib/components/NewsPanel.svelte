<script lang="ts">
  import { fetchAllNews } from '$lib/services/newsService.js';
  import { onMount, onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { fade, fly, scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { watch, FiniteStateMachine } from 'runed';
  import type { NewsItemWithUI } from '$lib/state/newsContext.js';
  import { zaurMoods, thoughtsOptions, discoveryComments, zaurReactions, categoryCommentary } from './news/commentaryData.js';
  import { generateComment, generateSpecificComment } from './news/commentService.js';
  import { hashString, getTimeSeed, getHourSeed, seededRandom, seededShuffle, decodeHtmlEntities } from './news/utils.js';
  import './news/NewsPanelStyles.css';
  
  // Extended NewsItem with Zaur UI elements
  interface ZaurNewsItem extends NewsItemWithUI {
    zaurComment?: string | null;
    justDiscovered?: boolean;
    discoveryComment?: string;
    isRemoving?: boolean;
    decodedTitle?: string;
    decodedSummary?: string;
    zaurMood?: string;
    isEmphasized?: boolean;
    hasReacted?: boolean;
  }
  
  // Define FSM types
  type NewsStates = 'idle' | 'loading' | 'error' | 'discovering' | 'emphasizing' | 'reacting' | 'sharing';
  type NewsEvents = 'loadStart' | 'loadSuccess' | 'loadFailure' | 'discover' | 'emphasize' | 'deemphasize' | 'react' | 'share' | 'closeShare' | 'retry';
  
  // Store current FSM state separately
  let currentFsmState = $state<NewsStates>('idle');
  
  // Create FSM for news panel
  const newsFsm = new FiniteStateMachine<NewsStates, NewsEvents>('idle', {
    idle: {
      _enter: () => {
        currentFsmState = 'idle';
      },
      loadStart: 'loading',
      discover: 'discovering',
      emphasize: 'emphasizing',
      react: 'reacting',
      share: 'sharing'
    },
    loading: {
      _enter: () => {
        currentFsmState = 'loading';
      },
      loadSuccess: 'idle',
      loadFailure: 'error'
    },
    error: {
      _enter: () => {
        currentFsmState = 'error';
      },
      retry: 'loading',
    },
    discovering: {
      _enter: async (meta) => {
        currentFsmState = 'discovering';
        
        // Set Zaur's mood to excited during discovery
        zaurMood = "excited";
        
        // If we have a specific item to discover from the event args
        if (meta.args && Array.isArray(meta.args) && meta.args.length > 0) {
          const availableItems = meta.args[0] as ZaurNewsItem[];
          const seed = meta.args.length > 1 ? meta.args[1] as number : Date.now();
          await discoverNewItem(availableItems, seed);
        } else {
          // Fallback to checking for discoveries
          checkForTimeBasedDiscoveries();
        }
        
        // Schedule transition back to idle after discovery completes
        newsFsm.debounce(5000, 'loadSuccess');
      },
      loadSuccess: 'idle'
    },
    emphasizing: {
      _enter: (meta) => {
        currentFsmState = 'emphasizing';
        
        if (meta.args && Array.isArray(meta.args) && meta.args.length > 0) {
          const itemId = meta.args[0] as string;
          // Update only the specific item
          updateSingleItem(itemId, { isEmphasized: true });
          
          // Remove emphasis after a few seconds
          newsFsm.debounce(4000, 'deemphasize', itemId);
        }
      },
      deemphasize: () => {
        // Handle via _enter with args
        return 'idle';
      }
    },
    reacting: {
      _enter: async (meta) => {
        currentFsmState = 'reacting';
        
        if (meta.args && Array.isArray(meta.args) && meta.args.length > 1) {
          const itemId = meta.args[0] as string;
          const reaction = meta.args[1] as string;
          
          const item = newsItems.find(item => item.id === itemId);
          if (item) {
            // Generate the comment
            const baseComment = item.zaurComment || "";
            const newComment = baseComment ? `${baseComment}\n\n${reaction}` : reaction;
            
            // Save to server first
            await saveZaurComment(itemId, newComment);
            
            // Update the specific item
            updateSingleItem(itemId, { 
              hasReacted: true, 
              zaurComment: newComment
            });
          }
        }
        
        // Return to idle state
        newsFsm.send('loadSuccess');
      },
      loadSuccess: 'idle'
    },
    sharing: {
      _enter: (meta) => {
        currentFsmState = 'sharing';
        
        if (meta.args && Array.isArray(meta.args) && meta.args.length > 0) {
          const itemId = meta.args[0] as string;
          activeShareItem = itemId;
          shareMenuVisible = true;
        }
      },
      closeShare: () => {
        activeShareItem = null;
        shareMenuVisible = false;
        return 'idle';
      }
    },
    // Wildcard state for handling global events
    '*': {
      loadStart: 'loading'
    }
  });
  
  // Track component state
  let newsItems = $state<ZaurNewsItem[]>([]);
  let allAvailableItems = $state<ZaurNewsItem[]>([]); // Store all available items
  let lastUpdated = $state<Date | null>(null);
  let isLoading = $derived(currentFsmState === 'loading');
  let error = $state<string | null>(null);
  let zaurThoughts = $state<string | null>(null);
  let zaurMood = $state<string>("curious"); // Default mood
  let discoverTimerId: number | null = null;
  let showingDiscovery = $derived(currentFsmState === 'discovering');
  let discoveryTimeout: number | null = null;
  let seenItemIds = new Set<string>();
  let lastCheckTime = 0;
  let emphasisTimerId: number | null = null;
  let reactionTimerId: number | null = null;
  let discoveredItemIds = new Set<string>();
  let zaurComments = new Map<string, string>(); // Map of itemId -> comment
  // Track last discovered items with timestamps for persistence across refreshes
  let lastDiscoveredItems: { itemId: string, timestamp: string }[] = [];
  // Track active share item
  let activeShareItem = $state<string | null>(null);
  let shareMenuVisible = $state(false);
  
  // Load previously discovered items from server
  async function loadDiscoveredItems(): Promise<void> {
    if (browser) {
      try {
        const response = await fetch('/api/discoveries?includeComments=true&includeTimestamps=true');
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (Array.isArray(data.items)) {
          // Create a proper Set from the array
          discoveredItemIds = new Set(data.items);
          console.log(`[ZaurNews] Loaded ${discoveredItemIds.size} discovered items from server`);
          
          // Get sorted items with timestamps (most recently discovered first)
          if (Array.isArray(data.itemsData)) {
            lastDiscoveredItems = data.itemsData;
            console.log(`[ZaurNews] Loaded discovery timestamps for ${lastDiscoveredItems.length} items`);
          }
          
          // Mark these items as discovered in our allAvailableItems array when it's loaded
          if (allAvailableItems.length > 0) {
            markDiscoveredItems();
          }
        }
        
        // Load Zaur's comments
        if (Array.isArray(data.comments)) {
          zaurComments.clear();
          data.comments.forEach((comment: { itemId: string, comment: string }) => {
            zaurComments.set(comment.itemId, comment.comment);
          });
          console.log(`[ZaurNews] Loaded ${zaurComments.size} Zaur comments from server`);
        }
      } catch (err) {
        console.error('Error loading discovered items from server:', err);
      }
    }
  }
  
  // Mark items as discovered in the allAvailableItems array
  function markDiscoveredItems(): void {
    if (discoveredItemIds.size === 0 || allAvailableItems.length === 0) return;
    
    // Clone the existing News Items to avoid references
    const currentItems = [...newsItems];
    
    // Create a map for quick lookup of most recent discovery time
    const discoveryTimes = new Map<string, string>();
    lastDiscoveredItems.forEach(item => {
      discoveryTimes.set(item.itemId, item.timestamp);
    });
    
    // Loop through all available items and check if they were previously discovered
    allAvailableItems.forEach(item => {
      // If this item was discovered before...
      if (discoveredItemIds.has(item.id)) {
        // Add discovered item's ID to the seenItemIds set
        seenItemIds.add(item.id);
        
        // Apply any saved comment
        const savedComment = zaurComments.get(item.id);
        if (savedComment) {
          item.zaurComment = savedComment;
          item.hasReacted = savedComment.includes("\n\n");
        }
        
        // If this was recently discovered (in the last 3 hours), mark it accordingly
        const discoveryTimestamp = discoveryTimes.get(item.id);
        if (discoveryTimestamp) {
          const discoveryTime = new Date(discoveryTimestamp).getTime();
          const now = new Date().getTime();
          const threeHoursInMs = 3 * 60 * 60 * 1000;
          
          if (now - discoveryTime < threeHoursInMs) {
            // This was discovered in the last 3 hours
            console.log(`[ZaurNews] Item ${item.id} was recently discovered, styling appropriately`);
            
            // Set subtle styles for recent discoveries but don't show the banner
            item.isEmphasized = true;
          }
        }
      }
    });
    
    console.log(`[ZaurNews] Marked ${discoveredItemIds.size} items as discovered`);
  }

  // Save a newly discovered item to the server
  async function saveDiscoveredItem(id: string, comment?: string): Promise<void> {
    if (browser) {
      try {
        const payload: any = { itemId: id };
        if (comment) {
          payload.comment = comment;
        }
        
        const response = await fetch('/api/discoveries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        // Add to discovered items Set to persist across page refreshes
        discoveredItemIds.add(id);
        
        // Add to lastDiscoveredItems with current timestamp
        const now = new Date().toISOString();
        lastDiscoveredItems.unshift({ itemId: id, timestamp: now });
        
        console.log(`[ZaurNews] Saved discovered item to server: ${id}`);
      } catch (err) {
        console.error('Error saving discovered item to server:', err);
      }
    }
  }
  
  // Save Zaur's comment for an item
  async function saveZaurComment(id: string, comment: string): Promise<void> {
    if (browser) {
      try {
        // POST to comments endpoint
        const response = await fetch('/api/discoveries/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ itemId: id, comment })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        // Update local cache
        zaurComments.set(id, comment);
        console.log(`[ZaurNews] Saved comment for item: ${id}`);
      } catch (err) {
        console.error('Error saving Zaur comment:', err);
      }
    }
  }
  
  // Utility function to format dates
  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }
  
  // Get deterministic thought for the day
  function getDailyThought(): string {
    const seed = getTimeSeed();
    const index = Math.floor(seededRandom(seed) * thoughtsOptions.length);
    return thoughtsOptions[index];
  }
  
  // Get deterministic mood for the hour
  function getHourlyMood(): string {
    const seed = getHourSeed();
    const index = Math.floor(seededRandom(seed) * zaurMoods.length);
    return zaurMoods[index];
  }
  
  // Get a Zaur commentary for a category
  function getZaurCommentary(category: string): string | null {
    const comments = categoryCommentary[category] || [];
    if (comments.length === 0) return null;
    
    // Deterministic but varies by hour
    const seed = getHourSeed() + category.charCodeAt(0);
    const index = Math.floor(seededRandom(seed) * comments.length);
    return comments[index];
  }
  
  // Apply saved comments to news items
  function applyZaurComments(): void {
    if (zaurComments.size === 0 || newsItems.length === 0) return;
    
    // Track which items we've already processed to avoid loops
    const processedIds = new Set<string>();
    let hasUpdates = false;
    
    const updatedItems = newsItems.map(item => {
      // Skip if we've already processed this item in this run
      if (processedIds.has(item.id)) return item;
      processedIds.add(item.id);
      
      // If we have a saved comment for this item, use it
      if (zaurComments.has(item.id)) {
        const savedComment = zaurComments.get(item.id);
        // Only update if the comment is different
        if (savedComment !== item.zaurComment) {
          hasUpdates = true;
          return {
            ...item,
            zaurComment: savedComment,
            hasReacted: savedComment?.includes("\n\n") || false
          };
        }
      }
      return item;
    });
    
    if (hasUpdates) {
      console.log('[ZaurNews] Applied saved comments to news items');
      // Use a direct assignment rather than the helper to avoid potential loops
      newsItems = updatedItems;
    }
  }
  
  // Process all items for later use
  function processNewsItems(items: any[]): ZaurNewsItem[] {
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
      
      // Use generateComment from commentService
      const comment = generateComment(item.title, category, savedComment, usedComments);
      
      return {
        ...item,
        isNew: false,
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
  
  // Function to load and curate news (initial load only)
  async function loadZaurNews(): Promise<void> {
    if (!browser) return;
    
    try {
      // Use the FSM to transition to loading state
      newsFsm.send('loadStart');
      
      // Set Zaur's mood
      zaurMood = getHourlyMood();
      
      // Generate a thought from Zaur that's consistent for all users today
      zaurThoughts = getDailyThought();
      
      const result = await fetchAllNews();
      await tick(); // Await a tick before updating state
      lastUpdated = result.lastUpdated;
      
      // Process all items for later use - pass to our new processing function
      const processedItems = processNewsItems(result.items);
      
      // Sort by date consistently - newest first
      const sortedItems = processedItems.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      allAvailableItems = sortedItems;
      
      // Apply our markDiscoveredItems function to mark all discovered items
      markDiscoveredItems();
      
      // Use deterministic selection based on today's date as seed
      const seed = getTimeSeed();
      
      // Zaur's curation logic
      const itemCount = 6;
      
      // First, prioritize the most recently discovered items (at least 1 or up to 2 slots)
      const recentlyDiscoveredItems: ZaurNewsItem[] = [];
      
      if (lastDiscoveredItems.length > 0) {
        // Get the most recently discovered items (up to 2)
        const recentDiscoveryIds = lastDiscoveredItems
          .slice(0, 2)
          .map(item => item.itemId);
          
        // Find these items in our available items
        for (const id of recentDiscoveryIds) {
          const foundItem = allAvailableItems.find(item => item.id === id);
          if (foundItem) {
            recentlyDiscoveredItems.push(foundItem);
            // If we have at least 1 recent discovery, that's enough
            if (recentlyDiscoveredItems.length > 0) {
              console.log(`[ZaurNews] Including last discovered item: ${id}`);
            }
          }
        }
      }
      
      // Next, include all previously discovered items, not just a subset 
      const otherDiscoveredItems: ZaurNewsItem[] = [];
      
      if (discoveredItemIds.size > 0) {
        // Filter out recently discovered items we already included
        const recentlyDiscoveredIds = new Set(recentlyDiscoveredItems.map(item => item.id));
        
        // Get discovered items from our allAvailableItems, excluding the recent ones
        const availableDiscoveredItems = allAvailableItems.filter(item => 
          discoveredItemIds.has(item.id) && !recentlyDiscoveredIds.has(item.id)
        );
        
        // Sort discovered items by date (newest first)
        const sortedDiscoveredItems = availableDiscoveredItems.sort((a, b) => 
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
        );
        
        // Include ALL discovered items, not just a subset
        otherDiscoveredItems.push(...sortedDiscoveredItems);
        
        if (otherDiscoveredItems.length > 0) {
          console.log(`[ZaurNews] Including ${otherDiscoveredItems.length} other discovered items`);
        }
      }
      
      // Combine all discovered items
      const allDiscoveredItems = [...recentlyDiscoveredItems, ...otherDiscoveredItems];
      
      // Calculate slots for new content - ensure we display at least 2 new undiscovered items
      const minNewItems = 2;
      let remainingSlots = Math.max(minNewItems, itemCount - allDiscoveredItems.length);
      
      // If we have too many discovered items, increase the total count dynamically
      if (allDiscoveredItems.length > itemCount - minNewItems) {
        console.log(`[ZaurNews] Increasing display count to fit all discovered items plus ${minNewItems} new items`);
      }
      
      // Get items that haven't been discovered yet
      const undiscoveredItems = allAvailableItems.filter(item => 
        !discoveredItemIds.has(item.id)
      );
      
      // Ensure source diversity - group by source
      const itemsBySource = new Map<string, ZaurNewsItem[]>();
      undiscoveredItems.forEach(item => {
        if (!itemsBySource.has(item.source)) {
          itemsBySource.set(item.source, []);
        }
        itemsBySource.get(item.source)!.push(item);
      });
      
      // Prioritize diversity in sources
      const selectedNewItems: ZaurNewsItem[] = [];
      const usedSources = new Set<string>();
      
      // First, try to get one item from each source
      for (const [source, items] of itemsBySource.entries()) {
        if (selectedNewItems.length >= remainingSlots) break;
        
        // Sort items from this source by date (newest first)
        const sortedSourceItems = items.sort((a, b) => 
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
        );
        
        // Take the newest item from this source
        if (sortedSourceItems.length > 0) {
          selectedNewItems.push(sortedSourceItems[0]);
          usedSources.add(source);
        }
      }
      
      // If we still need more items, take seconds from each source
      if (selectedNewItems.length < remainingSlots) {
        for (const [source, items] of itemsBySource.entries()) {
          if (selectedNewItems.length >= remainingSlots) break;
          
          // Sort items from this source by date (newest first)
          const sortedSourceItems = items.sort((a, b) => 
            new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
          );
          
          // Take the second newest item from this source if available
          if (sortedSourceItems.length > 1) {
            selectedNewItems.push(sortedSourceItems[1]);
          }
        }
      }
      
      // If we still need more, use the shuffle approach as fallback
      if (selectedNewItems.length < remainingSlots) {
        const shuffled = seededShuffle(undiscoveredItems, seed);
        
        // Ensure diverse categories deterministically for the remaining needed slots
        const categories = new Set<string>();
        const additionalItems: ZaurNewsItem[] = [];
        
        // Try to get one from each category
        for (const item of shuffled) {
          if (selectedNewItems.includes(item)) continue;
          
          const category = item.category as string;
          if (!categories.has(category)) {
            categories.add(category);
            additionalItems.push(item);
            if (selectedNewItems.length + additionalItems.length >= remainingSlots) break;
          }
        }
        
        // Add these to our selected items
        selectedNewItems.push(...additionalItems);
      }
      
      // Final sorting of selected new items by date (newest first)
      selectedNewItems.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      // Combine discovered and new items
      const selectedItems = [...allDiscoveredItems, ...selectedNewItems];
      
      // Track which items we've shown
      selectedItems.forEach(item => seenItemIds.add(item.id));
      
      // Final sorting by date (newest first) for ALL items
      const finalItems = selectedItems.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      await tick(); // Ensure a tick before updating the rendered items
      newsItems = finalItems;
      
      // Apply comments after loading
      applyZaurComments();
      
      // Check for discoveries that should have happened based on timestamp
      checkForTimeBasedDiscoveries();
      
      // Start the discovery process after a small delay
      setTimeout(() => {
        startDiscoveryProcess();
        scheduleEmphasisBehavior();
        scheduleReactionBehavior();
      }, 1000);
      
      // Transition to idle state indicating success
      newsFsm.send('loadSuccess');
        
    } catch (err) {
      console.error('Error loading Zaur news:', err);
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Transition to error state
      newsFsm.send('loadFailure');
    }
  }
  
  // Helper function to batch UI updates
  function safeUpdateItems(newItems: ZaurNewsItem[]): void {
    if (browser) {
      // Use requestAnimationFrame to sync with the browser's render cycle
      requestAnimationFrame(() => {
        newsItems = newItems;
      });
    } else {
      newsItems = newItems;
    }
  }
  
  // Update individual news item without full rerender
  function updateSingleItem(id: string, updates: Partial<ZaurNewsItem>): void {
    const updatedItems = newsItems.map(item => 
      item.id === id 
        ? { ...item, ...updates }
        : item
    );
    
    safeUpdateItems(updatedItems);
  }
  
  // Function to simulate Zaur emphasizing different articles
  function scheduleEmphasisBehavior(): void {
    if (!browser) return;
    
    emphasisTimerId = window.setInterval(() => {
      // Only a 20% chance that Zaur decides to emphasize something
      if (Math.random() < 0.2 && newsItems.length > 0) {
        // Find an item that isn't already emphasized
        const nonEmphasizedItems = newsItems.filter(item => !item.isEmphasized);
        
        if (nonEmphasizedItems.length > 0) {
          // Pick a random non-emphasized article
          const randomIndex = Math.floor(Math.random() * nonEmphasizedItems.length);
          const itemToEmphasize = nonEmphasizedItems[randomIndex];
          
          // Use FSM to handle emphasis
          newsFsm.send('emphasize', itemToEmphasize.id);
        }
      }
    }, 20000); // Reduced frequency - check every 20 seconds
  }
  
  // Function to add occasional reactions to articles
  function scheduleReactionBehavior(): void {
    if (!browser) return;
    
    reactionTimerId = window.setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if we're at a reaction minute - add deterministic reactions at 5, 20, 35, 50 mins
      const reactionMinutes = [5, 20, 35, 50];
      if (!reactionMinutes.includes(currentMinute)) {
        return; // Not a reaction minute, skip
      }
      
      // Create a deterministic seed based on current hour and minute
      const seed = currentHour * 100 + currentMinute;
      
      // If we have no items, try to apply comments first
      if (newsItems.length === 0) {
        return;
      }
      
      // Find items that haven't had reactions yet
      const unreactedItems = newsItems.filter(item => !item.hasReacted);
      
      if (unreactedItems.length === 0) {
        return; // No unreacted items to react to
      }
      
      // Use seeded random to deterministically select an item
      const selectedIndex = Math.floor(seededRandom(seed) * unreactedItems.length);
      const itemToReact = unreactedItems[selectedIndex];
      
      // Get appropriate reactions from the imported zaurReactions
      const category = itemToReact.category as string;
      const possibleReactions = zaurReactions[category] || zaurReactions.general;
      
      // Use seeded random to deterministically select a reaction
      const reactionIndex = Math.floor(seededRandom(seed + 1) * possibleReactions.length);
      const reaction = possibleReactions[reactionIndex];
      
      // Log the reaction process
      console.log(`[ZaurNews] Adding reaction to item ${itemToReact.id}: ${reaction}`);
      
      // Use FSM to handle reaction
      newsFsm.send('react', itemToReact.id, reaction);
    }, 10000); // Check every 10 seconds to catch the window
  }
  
  // Helper for random moods
  function getRandomMood(): string {
    return zaurMoods[Math.floor(Math.random() * zaurMoods.length)];
  }
  
  // Function to check for time-based discoveries
  function checkForTimeBasedDiscoveries(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Define fixed discovery times (at 10, 25, 40, and 55 minutes past the hour)
    const discoveryMinutes = [10, 25, 40, 55];
    
    // Check if we're in a discovery minute
    const isDiscoveryMinute = discoveryMinutes.includes(currentMinute);
    
    if (isDiscoveryMinute && currentFsmState !== 'discovering' && allAvailableItems.length > 0) {
      // Generate a consistent seed based on current hour and minute
      // This ensures all users will see the same discovery at the same time
      const seed = currentHour * 100 + currentMinute;
      
      // Filter out items we've already discovered
      const undiscoveredItems = allAvailableItems.filter(item => !discoveredItemIds.has(item.id));
      
      // Only proceed if we have undiscovered items
      if (undiscoveredItems.length > 0) {
        // Use FSM to handle discovery
        newsFsm.send('discover', undiscoveredItems, seed);
      }
    }
  }
  
  // Start the discovery process
  function startDiscoveryProcess(): () => void {
    // Initial check when component mounts
    checkForTimeBasedDiscoveries();
    
    // Set up an interval to check every minute
    const interval = setInterval(() => {
      checkForTimeBasedDiscoveries();
      // Check for comments updates periodically, but only every 60 seconds
      applyZaurComments();
    }, 60000); // Check every minute
    
    // Set up a more frequent check to catch discovery minutes more precisely
    // This helps ensure we don't miss a discovery window
    const preciseInterval = setInterval(() => {
      const now = new Date();
      const seconds = now.getSeconds();
      
      // If we're at 0-10 seconds past the minute, check for discoveries
      // This gives us multiple chances to catch the discovery minute
      if (seconds <= 10) {
        checkForTimeBasedDiscoveries();
      }
    }, 5000); // Check every 5 seconds
    
    // Return a cleanup function to handle teardown
      return () => {
      clearInterval(interval);
      clearInterval(preciseInterval);
      if (discoveryTimeout) {
        clearTimeout(discoveryTimeout);
      }
    };
  }
  
  // Handle the discovery of a new item
  async function discoverNewItem(availableItems: ZaurNewsItem[], seed: number): Promise<void> {
    // Change Zaur's mood on discoveries
    zaurMood = "excited";
    
    // Get the current news items
    const currentItems = [...newsItems];
    
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
    
    // Use the imported generateComment function to get a comment for this item
    const zaurComment = generateComment(selectedItem.title, category, null, new Set());
    
    const newItem = { 
      ...selectedItem,
      isNew: true,
      justDiscovered: true,
      discoveryComment: discoveryComments[commentIndex],
      // If we couldn't find newer content, make it appear slightly newer
      publishDate: newerItems.length > 0 
        ? selectedItem.publishDate 
        : new Date(newestCurrentDate + 60000).toISOString(), // Make it 1 minute newer
      // Ensure decoded content is available
      decodedTitle: selectedItem.decodedTitle || decodeHtmlEntities(selectedItem.title),
      decodedSummary: selectedItem.decodedSummary || decodeHtmlEntities(selectedItem.summary),
      // Add Zaur's commentary
      zaurComment,
      zaurMood: "excited", // Zaur is excited about new discoveries
      isEmphasized: true  // Emphasize new discoveries automatically
    };
    
    // Add to seen items list
    seenItemIds.add(newItem.id);
    
    // Add to discovered items list to ensure it's tracked across page refreshes
    discoveredItemIds.add(newItem.id);
    
    // Save to server with initial comment
    await saveDiscoveredItem(newItem.id);
    
    // Also save Zaur's comment if available
    if (zaurComment) {
      await saveZaurComment(newItem.id, zaurComment);
    }
    
    // Show the discovery indicator first
    showingDiscovery = true;
    
    // Wait a moment for user to notice the indicator
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Now add the new item - DO NOT remove existing items
    // Always ensure items are sorted by date (newest first)
    const updatedItems = [
      newItem, 
      ...newsItems
    ].sort((a, b) => 
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
    
    // Update with the next animation frame
    safeUpdateItems(updatedItems);
    
    // Hide the discovery indicator after a delay
    await new Promise(resolve => {
      discoveryTimeout = window.setTimeout(() => {
        showingDiscovery = false;
        discoveryTimeout = null;
        resolve(null);
      }, 5000);
    });
    
    // Clear the "justDiscovered" flag after animation completes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update the newsItems array to remove the "justDiscovered" flag but keep emphasis for a bit
    updateSingleItem(newItem.id, { justDiscovered: false });
    
    // After a few more seconds, remove the emphasis and return Zaur to normal mood
    setTimeout(() => {
      updateSingleItem(newItem.id, { isEmphasized: false });
      zaurMood = getHourlyMood();
    }, 10000);
  }
  
  // Function to regenerate all comments for displayed news items
  function regenerateComments(): void {
    if (newsItems.length === 0) return;
    
    // Create a new set to track used comments
    const usedComments = new Set<string>();
    
    // Process each item to generate a fresh comment
    const updatedItems = newsItems.map(item => {
      // Only regenerate if not manually set (saved)
      if (!zaurComments.has(item.id)) {
        const comment = generateComment(item.title, item.category as string, null, usedComments);
        return {
          ...item,
          zaurComment: comment
        };
      }
      return item;
    });
    
    // Update the news items
    newsItems = updatedItems;
    console.log('[ZaurNews] Regenerated comments for displayed items');
  }
  
  // Cleanup on component destroy
  onDestroy(() => {
    if (browser) {
      if (discoverTimerId !== null) {
        window.clearInterval(discoverTimerId);
      }
      if (discoveryTimeout !== null) {
        window.clearTimeout(discoveryTimeout);
      }
      if (emphasisTimerId !== null) {
        window.clearInterval(emphasisTimerId);
      }
      if (reactionTimerId !== null) {
        window.clearInterval(reactionTimerId);
      }
    }
  });
  
  // Handle share button click
  function handleShareClick(id: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Use the FSM to handle share toggle
    if (activeShareItem === id) {
      newsFsm.send('closeShare');
    } else {
      newsFsm.send('share', id);
    }
  }
  
  // Share via different platforms
  async function shareVia(platform: string, item: ZaurNewsItem, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    const url = item.url;
    const title = item.decodedTitle || item.title;
    const text = `${title} - shared via Zaur`;
    
    // Close share menu using FSM
    newsFsm.send('closeShare');
    
    try {
      switch (platform) {
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'copy':
          await navigator.clipboard.writeText(url);
          // Show temporary success message
          const shareElement = document.getElementById(`share-${item.id}`);
          if (shareElement) {
            const original = shareElement.innerHTML;
            shareElement.innerHTML = 'Copied!';
            setTimeout(() => {
              shareElement.innerHTML = original;
            }, 2000);
          }
          break;
        case 'share':
          // Use Web Share API if available
          if (navigator.share) {
            await navigator.share({
              title: title,
              text: text,
              url: url
            });
          }
          break;
      }
    } catch (err) {
      console.error('Error sharing content:', err);
    }
  }
  
  // Close share menu when clicking outside
  function handleDocumentClick(event: MouseEvent): void {
    if (shareMenuVisible) {
      const shareMenus = document.querySelectorAll('.zaur-share-menu');
      let clickedInside = false;
      
      shareMenus.forEach(menu => {
        if (menu.contains(event.target as Node)) {
          clickedInside = true;
        }
      });
      
      const shareButtons = document.querySelectorAll('.zaur-share-button');
      shareButtons.forEach(button => {
        if (button.contains(event.target as Node)) {
          clickedInside = true;
        }
      });
      
      if (!clickedInside) {
        // Use FSM to handle closing
        newsFsm.send('closeShare');
      }
    }
  }
  
  // Add document click listener when component mounts
  onMount(() => {
    if (browser) {
      document.addEventListener('click', handleDocumentClick);
      
      // For testing comment updates, add a flag to trigger regeneration
      const shouldRegenerateComments = true;
      
      // Load discovered items from server
      loadDiscoveredItems().then(() => {
        // Now load the news, which will use the comments we just loaded
        loadZaurNews().then(() => {
          // For testing purposes, regenerate comments after loading
          if (shouldRegenerateComments) {
            regenerateComments();
          }
        });
      });
    }
    
    return () => {
      if (browser) {
        document.removeEventListener('click', handleDocumentClick);
      }
    };
  });
  
  // Custom sort function that prioritizes recently discovered items
  function sortWithDiscoveriesAtTop(items: ZaurNewsItem[]): ZaurNewsItem[] {
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
</script>

<div class="zaur-news-panel" class:zaur-mood-curious={zaurMood === 'curious'} 
                             class:zaur-mood-excited={zaurMood === 'excited'} 
                             class:zaur-mood-thoughtful={zaurMood === 'thoughtful'}
                             class:zaur-mood-amused={zaurMood === 'amused'}
                             class:zaur-mood-intrigued={zaurMood === 'intrigued'}
                             class:zaur-mood-surprised={zaurMood === 'surprised'}>
  <div class="zaur-news-header">
    <h2>
      {#if zaurMood === 'curious'}
        <span class="zaur-mood-emoji">🔍</span>
      {:else if zaurMood === 'excited'}
        <span class="zaur-mood-emoji">✨</span>
      {:else if zaurMood === 'thoughtful'}
        <span class="zaur-mood-emoji">💭</span>
      {:else if zaurMood === 'amused'}
        <span class="zaur-mood-emoji">😊</span>
      {:else if zaurMood === 'intrigued'}
        <span class="zaur-mood-emoji">🤔</span>
      {:else if zaurMood === 'surprised'}
        <span class="zaur-mood-emoji">😲</span>
        {/if}
      Zaur's Picks
    </h2>
    
    {#if zaurThoughts}
      <p class="zaur-thoughts" transition:fade={{ duration: 400 }}>
        <span class="zaur-icon">🧠</span> {zaurThoughts}
      </p>
        {/if}
    </div>
    
  {#if showingDiscovery}
    <div class="zaur-discovery-indicator" transition:fade={{ duration: 300 }}>
      <div class="zaur-discovery-pulse"></div>
      <p>Zaur is discovering something interesting...</p>
      </div>
    {/if}
    
  <div class="zaur-news-content">
    {#if isLoading && newsItems.length === 0}
      <div class="zaur-loading" transition:fade={{ duration: 200 }}>
        <div class="zaur-thinking"></div>
        <p>Zaur is curating content for you...</p>
      </div>
    {:else if error && newsItems.length === 0}
      <div class="zaur-error-message">
        <p>Zaur encountered an issue while gathering news:</p>
        <p>{error}</p>
        <button onclick={() => newsFsm.send('retry')}>Ask Zaur to try again</button>
      </div>
    {:else if newsItems.length === 0}
      <div class="zaur-empty-state">
        <p>Zaur hasn't found anything interesting yet.</p>
        <p>Check back later for curated content.</p>
      </div>
    {:else}
      <div class="zaur-news-list">
        {#each newsItems as item, i (item.id)}
          <div 
            id={item.id}
            class="zaur-news-item" 
            class:just-discovered={item.justDiscovered}
            class:is-removing={item.isRemoving}
            class:is-emphasized={item.isEmphasized}
            animate:flip={{ duration: 300 }}
            transition:fly={{ 
              y: 20, 
              duration: 400, 
              delay: i * 150 
            }}
          >
            {#if item.justDiscovered}
              <div class="zaur-discovery-banner" transition:fade={{ duration: 500 }}>
                <span class="zaur-discovery-icon">💡</span> 
                <span>{item.discoveryComment}</span>
              </div>
            {/if}
            
            {#if item.isEmphasized}
              <div class="zaur-emphasis-indicator" transition:scale={{ start: 0.5, duration: 300 }}>
                <span class="zaur-emphasis-pulse"></span>
              </div>
            {/if}
            
            <div class="zaur-news-item-header">
              <div class="zaur-news-source">
                {item.source}
              </div>
              <div class="zaur-news-date">{formatDate(new Date(item.publishDate))}</div>
            </div>
            
            <h3 class="zaur-news-title">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.decodedTitle || item.title}
              </a>
            </h3>
            
            {#if item.decodedSummary && item.decodedSummary.trim() !== ''}
              <p class="zaur-news-summary">
                {item.decodedSummary}
              </p>
            {/if}
            
            {#if item.zaurComment}
              <div class="zaur-comment" class:is-emphasized={item.isEmphasized}>
                <span class="zaur-comment-prefix">Zaur's note:</span> {item.zaurComment}
              </div>
            {/if}
            
            {#if item.imageUrl}
              <div class="zaur-news-image">
                <img src={item.imageUrl} alt={item.title} loading="lazy" />
              </div>
            {/if}
            
            <div class="zaur-news-item-footer">
              <div class="zaur-news-meta">
                {#if item.author && item.author !== 'unknown' && !item.author.includes('http')}
                  <div class="zaur-news-author">By {item.author}</div>
                {/if}
              </div>
              
              <div class="zaur-news-actions">
                <button 
                  class="zaur-share-button" 
                  onclick={(e) => handleShareClick(item.id, e)}
                  aria-label="Share this article"
                >
                  <span class="zaur-share-icon">📤</span>
                  <span class="zaur-share-text">Share</span>
                </button>
                
                {#if activeShareItem === item.id}
                  <div class="zaur-share-menu" transition:scale={{ start: 0.8, duration: 200 }}>
                    <button class="zaur-share-option" onclick={(e) => shareVia('twitter', item, e)}>
                      Twitter
                    </button>
                    <button class="zaur-share-option" onclick={(e) => shareVia('linkedin', item, e)}>
                      LinkedIn
                    </button>
                    <button class="zaur-share-option" onclick={(e) => shareVia('facebook', item, e)}>
                      Facebook
                    </button>
                    <button id="share-{item.id}" class="zaur-share-option" onclick={(e) => shareVia('copy', item, e)}>
                      Copy Link
                    </button>
                    {#if browser && typeof navigator.share === 'function'}
                      <button class="zaur-share-option" onclick={(e) => shareVia('share', item, e)}>
                        More Options
                      </button>
                    {/if}
                  </div>
                {/if}
                
                <a href={item.url} class="zaur-read-more" target="_blank" rel="noopener noreferrer">
                  Read full article
                </a>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div> 