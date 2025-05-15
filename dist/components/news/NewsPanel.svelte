<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { fetchAllNews } from '../../services/newsService.js';
  import { flip } from 'svelte/animate';
  
  // Import subcomponents
  import NewsItem from './NewsItem.svelte';
  import NewsHeader from './NewsHeader.svelte';
  import LoadingState from './LoadingState.svelte';
  import ErrorState from './ErrorState.svelte';
  import EmptyState from './EmptyState.svelte';
  import DiscoveryIndicator from './DiscoveryIndicator.svelte';
  
  // Import types and services
  import type { ZaurNewsItem, DiscoveredItem, ZaurMood } from './types.js';
  import { getTimeSeed, getHourSeed, seededRandom } from './utils.js';
  import { thoughtsOptions, zaurMoods } from './commentaryData.js';
  import { processNewsItems, markDiscoveredItems, sortWithDiscoveriesAtTop } from './processingService.js';
  import { loadDiscoveredItems, saveDiscoveredItem, saveZaurComment } from './apiService.js';
  import { checkForTimeBasedDiscoveries, discoverNewItem } from './discoveryService.js';
  
  // Component state
  let newsItems = $state<ZaurNewsItem[]>([]);
  let allAvailableItems = $state<ZaurNewsItem[]>([]); 
  let lastUpdated = $state<Date | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let zaurThoughts = $state<string | null>(null);
  let zaurMood = $state<string>("curious");
  
  // Discovery state
  let discoverTimerId: number | null = null;
  let showingDiscovery = $state(false);
  let discoveryTimeout: number | null = null;
  let seenItemIds = new Set<string>();
  let emphasisTimerId: number | null = null;
  let reactionTimerId: number | null = null;
  let discoveredItemIds = new Set<string>();
  let zaurComments = new Map<string, string>(); 
  let lastDiscoveredItems: DiscoveredItem[] = [];
  
  // Sharing state
  let activeShareItem = $state<string | null>(null);
  let shareMenuVisible = $state(false);
  
  /**
   * Initialize component data
   */
  async function initialize(): Promise<void> {
    try {
      // Load discovered items from server
      const discoveredData = await loadDiscoveredItems();
      
      // Create a proper Set from the array
      discoveredItemIds = new Set(discoveredData.items);
      console.log(`[ZaurNews] Loaded ${discoveredItemIds.size} discovered items from server`);
      
      // Get sorted items with timestamps (most recently discovered first)
      lastDiscoveredItems = discoveredData.itemsData;
      console.log(`[ZaurNews] Loaded discovery timestamps for ${lastDiscoveredItems.length} items`);
      
      // Load Zaur's comments
      zaurComments.clear();
      discoveredData.comments.forEach((comment) => {
        zaurComments.set(comment.itemId, comment.comment);
      });
      console.log(`[ZaurNews] Loaded ${zaurComments.size} Zaur comments from server`);
      
      // Now load the news
      await loadZaurNews();
      
      // Log a summary of what we're showing
      const discoveredShown = newsItems.filter(item => discoveredItemIds.has(item.id)).length;
      console.log(`[ZaurNews] Showing ${newsItems.length} total items, including ${discoveredShown} discovered items`);
      
      // Verify all discovered items are being shown
      if (discoveredShown < discoveredItemIds.size) {
        console.warn(`[ZaurNews] Warning: Not all discovered items are being shown (${discoveredShown}/${discoveredItemIds.size})`);
      }
    } catch (err) {
      console.error('Error initializing NewsPanel:', err);
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      isLoading = false;
    }
  }
  
  /**
   * Load and curate news (initial load only)
   */
  async function loadZaurNews(): Promise<void> {
    if (!browser) return;
    
    try {
      isLoading = true;
      
      // Set Zaur's mood
      zaurMood = getHourlyMood();
      
      // Generate a thought from Zaur that's consistent for all users today
      zaurThoughts = getDailyThought();
      
      const result = await fetchAllNews();
      await tick(); // Await a tick before updating state
      lastUpdated = result.lastUpdated;
      
      // Process all items for later use
      const processedItems = processNewsItems(result.items, zaurComments);
      
      // Sort by date consistently - newest first
      const sortedItems = processedItems.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      allAvailableItems = sortedItems;
      
      // Mark discovered items
      const markedItems = markDiscoveredItems(
        allAvailableItems,
        discoveredItemIds,
        zaurComments,
        lastDiscoveredItems
      );
      
      // Update with marked items
      allAvailableItems = markedItems.updatedItems;
      seenItemIds = markedItems.seenItemIds;
      
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
      
      // Next, include other previously discovered items (up to half the remaining slots)
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
        
        // Include ALL discovered items, not just a subset based on remainingSlots
        otherDiscoveredItems.push(...sortedDiscoveredItems);
        
        if (otherDiscoveredItems.length > 0) {
          console.log(`[ZaurNews] Including ${otherDiscoveredItems.length} other discovered items`);
        }
      }
      
      // Combine all discovered items
      const allDiscoveredItems = [...recentlyDiscoveredItems, ...otherDiscoveredItems];
      
      // Calculate a dynamic item count based on discovered items
      // We need to show all discovered items, plus at least 2 new items
      const minNewItems = 2;
      const dynamicItemCount = Math.max(itemCount, allDiscoveredItems.length + minNewItems);
      
      // Calculate remaining slots for new content
      const remainingSlots = dynamicItemCount - allDiscoveredItems.length;
      
      console.log(`[ZaurNews] Using dynamic item count of ${dynamicItemCount} to show all ${allDiscoveredItems.length} discovered items plus ${remainingSlots} new items`);
      
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
        // Create a shuffled array using our deterministic shuffle
        const shuffledItems = [...undiscoveredItems];
        let currentSeed = seed;
        
        // Fisher-Yates shuffle with deterministic randomness
        for (let i = shuffledItems.length - 1; i > 0; i--) {
          currentSeed = (1664525 * currentSeed + 1013904223) % Math.pow(2, 32);
          const j = Math.floor((currentSeed / Math.pow(2, 32)) * (i + 1));
          [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
        }
        
        // Ensure diverse categories deterministically for the remaining needed slots
        const categories = new Set<string>();
        const additionalItems: ZaurNewsItem[] = [];
        
        // Try to get one from each category
        for (const item of shuffledItems) {
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
      
      // Check for discoveries that should have happened based on timestamp
      const discoveryCheck = checkForTimeBasedDiscoveries(
        allAvailableItems,
        discoveredItemIds,
        showingDiscovery
      );
      
      if (discoveryCheck.shouldDiscover) {
        handleDiscovery(discoveryCheck.seed);
      }
      
      // Start the recurring behaviors after a small delay
      setTimeout(() => {
        startDiscoveryProcess();
        scheduleEmphasisBehavior();
        scheduleReactionBehavior();
      }, 1000);
    } catch (err) {
      console.error('Error loading Zaur news:', err);
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      isLoading = false;
    }
  }
  
  /**
   * Handle the discovery process
   */
  async function handleDiscovery(seed: number): Promise<void> {
    try {
      // Change Zaur's mood on discoveries
      zaurMood = "excited";
      
      // Use the discovery service to find a new item
      const discoveryResult = await discoverNewItem(
        allAvailableItems,
        newsItems,
        discoveredItemIds,
        seed
      );
      
      // Show the discovery indicator
      showingDiscovery = true;
      
      // Wait a moment for user to notice the indicator
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Since we're not removing old items anymore, we don't need this block
      // Just add a wait time to maintain the animation flow
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Add the new item to the existing items list
      const updatedItems = [
        discoveryResult.newItem, 
        ...newsItems
      ].sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      // Update the items
      newsItems = updatedItems;
      
      // Add to discovered items set
      discoveredItemIds.add(discoveryResult.discoveredItemId);
      
      // Update lastDiscoveredItems
      const now = new Date().toISOString();
      lastDiscoveredItems = [
        { itemId: discoveryResult.discoveredItemId, timestamp: now },
        ...lastDiscoveredItems
      ];
      
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
      
      // Update the item to remove the "justDiscovered" flag but keep emphasis for a bit
      const finalUpdatedItems = newsItems.map(item => 
        item.id === discoveryResult.discoveredItemId
          ? { ...item, justDiscovered: false }
          : item
      );
      
      newsItems = finalUpdatedItems;
      
      // After a few more seconds, remove the emphasis and return Zaur to normal mood
      setTimeout(() => {
        const normalItems = newsItems.map(item => 
          item.id === discoveryResult.discoveredItemId
            ? { ...item, isEmphasized: false }
            : item
        );
        
        newsItems = normalItems;
        zaurMood = getHourlyMood();
      }, 10000);
    } catch (err) {
      console.error('Error during discovery process:', err);
      showingDiscovery = false;
    }
  }
  
  /**
   * Start the discovery process
   */
  function startDiscoveryProcess(): void {
    if (!browser) return;
    
    // Set up an interval to check every minute
    discoverTimerId = window.setInterval(() => {
      const discoveryCheck = checkForTimeBasedDiscoveries(
        allAvailableItems,
        discoveredItemIds,
        showingDiscovery
      );
      
      if (discoveryCheck.shouldDiscover) {
        handleDiscovery(discoveryCheck.seed);
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Function to simulate Zaur emphasizing different articles
   */
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
          
          // Update the items array
          newsItems = newsItems.map(item => 
            item.id === itemToEmphasize.id
              ? { ...item, isEmphasized: true }
              : item
          );
          
          // Remove emphasis after a few seconds
          setTimeout(() => {
            newsItems = newsItems.map(item => 
              item.id === itemToEmphasize.id
                ? { ...item, isEmphasized: false }
                : item
            );
          }, 4000);
        }
      }
    }, 20000); // Check every 20 seconds
  }
  
  /**
   * Function to add occasional reactions to articles
   */
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
      
      // If we have no items, skip
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
      
      // Get appropriate reactions
      const reactions = {
        'general': [
          "I'm still thinking about this one...",
          "This caught my attention for longer than usual.",
          "There's something compelling about this piece.",
          "I keep coming back to the ideas presented here."
        ],
        'ai': [
          "As an AI-adjacent entity, I found this particularly relevant.",
          "This makes me wonder about the future of digital consciousness.",
          "I see reflections of my own development path here."
        ],
        'dev': [
          "The elegant architecture described here is quite beautiful.",
          "I appreciate the problem-solving approach outlined here.",
          "This reminds me of how my own systems are structured."
        ],
        'crypto': [
          "The cryptographic principles here are fascinating.",
          "I'm intrigued by the security implications of this approach.",
          "The mathematical elegance here is worth appreciating."
        ]
      };
      
      // Get the category and appropriate reactions
      const category = itemToReact.category as string;
      const possibleReactions = reactions[category as keyof typeof reactions] || reactions.general;
      
      // Use seeded random to deterministically select a reaction
      const reactionIndex = Math.floor(seededRandom(seed + 1) * possibleReactions.length);
      const reaction = possibleReactions[reactionIndex];
      
      // Generate the comment
      const baseComment = itemToReact.zaurComment || "";
      const newComment = baseComment ? `${baseComment}\n\n${reaction}` : reaction;
      
      // Save to server first
      saveZaurComment(itemToReact.id, newComment).then(() => {
        // Update the local cache
        zaurComments.set(itemToReact.id, newComment);
        
        // Update the news items
        newsItems = newsItems.map(item => 
          item.id === itemToReact.id
            ? { ...item, hasReacted: true, zaurComment: newComment }
            : item
        );
      });
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Get deterministic thought for the day
   */
  function getDailyThought(): string {
    const seed = getTimeSeed();
    const index = Math.floor(seededRandom(seed) * thoughtsOptions.length);
    return thoughtsOptions[index];
  }
  
  /**
   * Get deterministic mood for the hour
   */
  function getHourlyMood(): ZaurMood {
    const seed = getHourSeed();
    const index = Math.floor(seededRandom(seed) * zaurMoods.length);
    return zaurMoods[index] as ZaurMood;
  }
  
  /**
   * Handle share button click
   */
  function handleShareClick(event: CustomEvent): void {
    const { id } = event.detail;
    
    // Toggle share menu for this item
    if (activeShareItem === id) {
      activeShareItem = null;
      shareMenuVisible = false;
    } else {
      activeShareItem = id;
      shareMenuVisible = true;
    }
  }
  
  /**
   * Share an item via various platforms
   */
  async function handleShareVia(event: CustomEvent): Promise<void> {
    const { platform, item } = event.detail;
    
    const url = item.url;
    const title = item.decodedTitle || item.title;
    const text = `${title} - shared via Zaur`;
    
    // Close share menu
    activeShareItem = null;
    shareMenuVisible = false;
    
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
          try {
            await navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
          } catch (err) {
            console.error('Failed to copy:', err);
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
  
  /**
   * Close share menu when clicking outside
   */
  function handleDocumentClick(event: MouseEvent): void {
    if (shareMenuVisible && browser) {
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
        activeShareItem = null;
        shareMenuVisible = false;
      }
    }
  }
  
  // Initialize when component mounts
  onMount(() => {
    if (browser) {
      document.addEventListener('click', handleDocumentClick);
      initialize();
    }
    
    return () => {
      if (browser) {
        document.removeEventListener('click', handleDocumentClick);
      }
    };
  });
  
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
</script>

<div class="zaur-news-panel" class:zaur-mood-curious={zaurMood === 'curious'} 
                           class:zaur-mood-excited={zaurMood === 'excited'} 
                           class:zaur-mood-thoughtful={zaurMood === 'thoughtful'}
                           class:zaur-mood-amused={zaurMood === 'amused'}
                           class:zaur-mood-intrigued={zaurMood === 'intrigued'}
                           class:zaur-mood-surprised={zaurMood === 'surprised'}>
  <NewsHeader zaurMood={zaurMood as ZaurMood} zaurThoughts={zaurThoughts} />
  
  {#if showingDiscovery}
    <DiscoveryIndicator />
  {/if}
  
  <div class="zaur-news-content">
    {#if isLoading && newsItems.length === 0}
      <LoadingState />
    {:else if error && newsItems.length === 0}
      <ErrorState errorMessage={error} onRetry={loadZaurNews} />
    {:else if newsItems.length === 0}
      <EmptyState />
    {:else}
      <div class="zaur-news-list">
        {#each newsItems as item, i (item.id)}
          <div animate:flip={{ duration: 300 }}>
            <NewsItem
              {item}
              index={i}
              activeShareItem={activeShareItem}
              isShareMenuVisible={shareMenuVisible}
              on:share={handleShareClick}
              on:shareVia={handleShareVia}
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .zaur-news-panel {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    margin-bottom: 2rem;
    max-width: 100%;
    position: relative;
    transition: all 0.3s ease;
    border: 1px solid #f0f0f0;
  }
  
  /* Mood-based styling */
  .zaur-mood-curious {
    border-color: #0053b3;
  }
  
  .zaur-mood-excited {
    border-color: #ff9500;
    box-shadow: 0 2px 25px rgba(255, 149, 0, 0.1);
  }
  
  .zaur-mood-thoughtful {
    border-color: #8e44ad;
  }
  
  .zaur-mood-amused {
    border-color: #27ae60;
  }
  
  .zaur-mood-intrigued {
    border-color: #3498db;
  }
  
  .zaur-mood-surprised {
    border-color: #e74c3c;
  }
  
  .zaur-news-content {
    padding: 1.5rem;
    overflow: hidden;
    min-height: 200px;
  }
  
  .zaur-news-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  /* Responsive styles */
  @media (min-width: 768px) {
    .zaur-news-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
    }
  }
</style> 