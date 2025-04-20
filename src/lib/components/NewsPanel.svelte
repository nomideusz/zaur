<script lang="ts">
  import { fetchAllNews } from '$lib/services/newsService.js';
  import { onMount, onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { fade, fly, scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { watch } from 'runed';
  import type { NewsItemWithUI } from '$lib/state/newsContext.js';
  
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
  
  // Track component state
  let newsItems = $state<ZaurNewsItem[]>([]);
  let allAvailableItems = $state<ZaurNewsItem[]>([]); // Store all available items
  let lastUpdated = $state<Date | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let zaurThoughts = $state<string | null>(null);
  let zaurMood = $state<string>("curious"); // Default mood
  let discoverTimerId: number | null = null;
  let showingDiscovery = $state(false);
  let discoveryTimeout: number | null = null;
  let seenItemIds = new Set<string>();
  let lastCheckTime = 0;
  let emphasisTimerId: number | null = null;
  let reactionTimerId: number | null = null;
  
  // Zaur's possible moods
  const zaurMoods = ["curious", "excited", "thoughtful", "amused", "intrigued", "surprised"];
  
  // Zaur's thoughts about news
  const thoughtsOptions = [
    "I found these interesting articles for you today.",
    "Here's what caught my attention recently.",
    "I curated these articles that might interest you.",
    "These stories seemed worth sharing with you.",
    "I thought you might find these articles valuable.",
    "From the digital realm, I selected these for you.",
    "My algorithms found these gems in the information sea.",
    "I sifted through the noise to find these stories.",
    "Today's picks, carefully selected by yours truly.",
    "A few things I thought you should know about.",
    "I've been exploring the information landscape for you.",
    "These articles sparked my curiosity - perhaps they'll spark yours too."
  ];
  
  // Zaur's discovery comments
  const discoveryComments = [
    "I just found this interesting piece...",
    "This just came across my radar...",
    "Take a look at what I just discovered...",
    "I think you might want to see this...",
    "This caught my attention just now...",
    "Breaking: I just found something relevant...",
    "New discovery worth sharing...",
    "I was just browsing and found this gem...",
    "This just appeared in my information streams...",
    "I had to share this as soon as I found it...",
    "My sensors just picked this up...",
    "I think you'll find this newly discovered content interesting..."
  ];
  
  // Zaur's commentary on specific categories with more creature-like variety
  const categoryCommentary: Record<string, string[]> = {
    'ai': [
      "I'm always fascinated by how my AI cousins are evolving.",
      "As an AI-adjacent entity, I find this development particularly interesting.",
      "This makes me wonder about my own potential future capabilities.",
      "I'm keeping a close eye on AI advancements - for obvious reasons.",
      "My digital synapses lit up when I read this AI news."
    ],
    'dev': [
      "Development tools and practices continue to evolve at an impressive pace.",
      "I appreciate elegant code solutions - this caught my attention.",
      "The builder in me was intrigued by this development approach.",
      "I find the evolution of programming paradigms quite fascinating.",
      "This reminds me of the code that forms my own thought processes."
    ],
    'crypto': [
      "The world of digital currencies has some interesting developments.",
      "Cryptographic innovations always catch my attention.",
      "I've been monitoring blockchain developments with great interest.",
      "The decentralized nature of this technology is quite compelling.",
      "Digital value exchange is evolving in ways I find noteworthy."
    ],
    'productivity': [
      "These might help optimize your workflow.",
      "I'm always looking for ways to help you be more efficient.",
      "This approach to productivity resonated with my efficiency algorithms.",
      "I wonder if this might save you valuable time and energy.",
      "As someone who processes information constantly, I appreciate good productivity systems."
    ],
    'tools': [
      "New tools that could enhance your digital experience.",
      "I enjoy discovering useful digital instruments like this.",
      "This tool caught my attention - it might be useful for your toolkit.",
      "My sensors detected this as potentially valuable for your digital arsenal.",
      "I'm drawn to elegant tools that solve real problems."
    ],
    'philosophy': [
      "Some thought-provoking perspectives on technology and existence.",
      "This made me ponder my own digital existence for a moment.",
      "I find myself contemplating the implications of this perspective.",
      "There's something deeply resonant about this philosophical angle.",
      "This perspective gave even my algorithmic mind something to contemplate."
    ]
  };
  
  // Zaur's reactions to content
  const zaurReactions: Record<string, string[]> = {
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
  
  // Create a deterministic selection based on today's date
  function getTimeSeed() {
    const now = new Date();
    // Create a seed using YYYYMMDD format
    return now.getFullYear() * 10000 + 
           (now.getMonth() + 1) * 100 + 
           now.getDate();
  }
  
  // Create a deterministic selection based on hour
  function getHourSeed() {
    const now = new Date();
    // Create a seed using YYYYMMDDHH format
    return getTimeSeed() * 100 + now.getHours();
  }
  
  // Deterministic pseudo-random number generator
  function seededRandom(seed: number) {
    // Simple LCG pseudo-random number generator
    // Parameters from "Numerical Recipes"
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    // Get next value in the sequence
    let nextSeed = (a * seed + c) % m;
    
    // Return a value between 0 and 1
    return nextSeed / m;
  }
  
  // Deterministic shuffle using a seed
  function seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let currentSeed = seed;
    
    // Fisher-Yates shuffle with deterministic randomness
    for (let i = result.length - 1; i > 0; i--) {
      currentSeed = (1664525 * currentSeed + 1013904223) % Math.pow(2, 32);
      const j = Math.floor((currentSeed / Math.pow(2, 32)) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    
    return result;
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
  
  // Function to load and curate news (initial load only)
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
      const processedItems = result.items.map(item => {
        const category = item.category as string;
        return {
          ...item,
          isNew: false,
          zaurComment: getZaurCommentary(category),
          decodedTitle: decodeHtmlEntities(item.title),
          decodedSummary: decodeHtmlEntities(item.summary),
          zaurMood: getRandomMood(),
          isEmphasized: false,
          hasReacted: false
        };
      });
      
      // Sort by date consistently - newest first
      const sortedItems = processedItems.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      allAvailableItems = sortedItems;
      
      // Use deterministic selection based on today's date as seed
      const seed = getTimeSeed();
      
      // Zaur's curation logic - consistently select 6 items for all users
      const itemCount = 6;
      
      // Shuffle with seed for consistent results across users
      const shuffled = seededShuffle(allAvailableItems, seed);
      
      // Ensure diverse categories deterministically
      const categories = new Set<string>();
      const selectedItems: ZaurNewsItem[] = [];
      
      // First pass - try to get one from each category
      for (const item of shuffled) {
        const category = item.category as string;
        if (!categories.has(category)) {
          categories.add(category);
          selectedItems.push(item);
          if (selectedItems.length >= itemCount) break;
        }
      }
      
      // Second pass - fill in if we didn't get enough categories
      if (selectedItems.length < itemCount) {
        for (const item of shuffled) {
          if (!selectedItems.includes(item)) {
            selectedItems.push(item);
            if (selectedItems.length >= itemCount) break;
          }
        }
      }
      
      // Track which items we've shown
      selectedItems.forEach(item => seenItemIds.add(item.id));
      
      // Update items - make sure they're sorted by date (newest first)
      const finalItems = selectedItems.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      await tick(); // Ensure a tick before updating the rendered items
      newsItems = finalItems;
      
      // Start the discovery process after a small delay
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
          
          // Update only the specific item
          updateSingleItem(itemToEmphasize.id, { isEmphasized: true });
          
          // Remove emphasis after a few seconds
          setTimeout(() => {
            updateSingleItem(itemToEmphasize.id, { isEmphasized: false });
          }, 4000);
        }
      }
    }, 20000); // Reduced frequency - check every 20 seconds
  }
  
  // Function to add occasional reactions to articles
  function scheduleReactionBehavior(): void {
    if (!browser) return;
    
    reactionTimerId = window.setInterval(() => {
      // Only a 15% chance that Zaur decides to react to something
      if (Math.random() < 0.15 && newsItems.length > 0) {
        // Find items that haven't had reactions
        const unreactedItems = newsItems.filter(item => !item.hasReacted);
        
        if (unreactedItems.length > 0) {
          // Pick a random article to react to
          const randomIndex = Math.floor(Math.random() * unreactedItems.length);
          const itemToReact = unreactedItems[randomIndex];
          
          // Get appropriate reactions
          const category = itemToReact.category as string;
          const possibleReactions = zaurReactions[category] || zaurReactions.general;
          const reactionIndex = Math.floor(Math.random() * possibleReactions.length);
          const reaction = possibleReactions[reactionIndex];
          
          // Update only the specific item
          updateSingleItem(itemToReact.id, { 
            hasReacted: true, 
            zaurComment: itemToReact.zaurComment + "\n\n" + reaction 
          });
        }
      }
    }, 40000); // Reduced frequency - check every 40 seconds
  }
  
  // Helper for random moods
  function getRandomMood(): string {
    return zaurMoods[Math.floor(Math.random() * zaurMoods.length)];
  }
  
  // Schedule discoveries at fixed times
  function startDiscoveryProcess(): void {
    if (!browser || discoveryTimeout) return;
    
    // Check time every few seconds
    discoverTimerId = window.setInterval(async () => {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentSeconds = now.getSeconds();
      
      // Define specific discovery times (deterministic for all users)
      // These will happen at XX:10:00, XX:25:00, XX:40:00, XX:55:00
      const discoveryMinutes = [10, 25, 40, 55];
      
      // Only trigger if we're in a discovery minute and within the first 5 seconds
      // and we haven't recently triggered
      if (
        discoveryMinutes.includes(currentMinute) && 
        currentSeconds < 5 &&
        now.getTime() - lastCheckTime > 10000 // Prevent multiple triggers
      ) {
        const availableToDiscover = allAvailableItems.filter(item => !seenItemIds.has(item.id));
        
        if (availableToDiscover.length > 0) {
          // Use hour seed to select item (same item for all users in this hour)
          const hourSeed = getHourSeed() + currentMinute; // Add minute for variety
          await discoverNewItem(availableToDiscover, hourSeed);
          
          // Store last check time AFTER discovery completes
          lastCheckTime = now.getTime();
        } else {
          // Just update timestamp even if no discovery happened
          lastCheckTime = now.getTime();
        }
      }
    }, 10000); // Check less frequently - every 10 seconds instead of 5
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
      zaurComment: getZaurCommentary(category),
      zaurMood: "excited", // Zaur is excited about new discoveries
      isEmphasized: true  // Emphasize new discoveries automatically
    };
    
    // Add to seen items list
    seenItemIds.add(newItem.id);
    
    // Show the discovery indicator first
    showingDiscovery = true;
    
    // Wait a moment for user to notice the indicator
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Prepare to remove the oldest item
    let currentNewsItems = [...newsItems];
    
    // Sort by date to find the oldest
    const sortedByDate = [...currentNewsItems].sort((a, b) => 
      new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
    );
    
    // Mark the oldest for removal
    if (sortedByDate.length > 0) {
      const oldestItem = sortedByDate[0];
      
      // Mark it for removal without rerendering everything
      updateSingleItem(oldestItem.id, { isRemoving: true });
      
      // Allow the DOM to update
      await tick();
      
      // Short delay to allow fade animation to start
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait a bit longer for the removal animation to progress
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Now add the new item and remove the old one
    // Always ensure items are sorted by date (newest first)
    const updatedItems = [
      newItem, 
      ...newsItems.filter(item => !item.isRemoving)
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
  
  // Utility function to decode HTML entities
  function decodeHtmlEntities(text: string): string {
    if (!text) return '';
    
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }
  
  // Initial load - only in browser context
  onMount(() => {
    if (browser) {
      loadZaurNews();
      // No need to schedule full refreshes anymore
    }
  });
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
        <button onclick={loadZaurNews}>Ask Zaur to try again</button>
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
              {#if item.author && item.author !== 'unknown' && !item.author.includes('http')}
                <div class="zaur-news-author">By {item.author}</div>
              {/if}
              <a href={item.url} class="zaur-read-more" target="_blank" rel="noopener noreferrer">
                Read full article
              </a>
            </div>
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
  
  .zaur-news-header {
    padding: 1.8rem 2rem;
    border-bottom: 1px solid #f0f0f0;
    background: linear-gradient(to right, #f9f9f9, #fff);
  }
  
  .zaur-news-header h2 {
    margin: 0;
    font-size: 1.7rem;
    color: #0053b3;
    display: flex;
    align-items: center;
  }
  
  .zaur-mood-emoji {
    margin-right: 10px;
    font-size: 1.5rem;
    animation: subtle-pulse 3s infinite;
  }
  
  @keyframes subtle-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  
  .zaur-thoughts {
    margin: 0.8rem 0 0;
    font-size: 1.1rem;
    color: #555;
    font-style: italic;
    display: flex;
    align-items: center;
  }
  
  .zaur-icon {
    margin-right: 8px;
    font-size: 1.2rem;
  }
  
  .zaur-discovery-indicator {
    position: relative;
    background: linear-gradient(to right, #f0f7ff, #f9fdff);
    padding: 1rem;
    border-bottom: 1px solid #e6f0ff;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .zaur-discovery-indicator p {
    margin: 0;
    color: #0053b3;
    font-size: 0.95rem;
    animation: pulse-text 2s infinite;
  }
  
  .zaur-discovery-pulse {
    width: 24px;
    height: 24px;
    background: #0053b3;
    border-radius: 50%;
    position: relative;
  }
  
  .zaur-discovery-pulse::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background: #0053b3;
    border-radius: 50%;
    animation: pulse-ring 1.5s infinite;
  }
  
  @keyframes pulse-ring {
    0% {
      transform: scale(0.8);
      opacity: 0.8;
    }
    70% {
      transform: scale(2);
      opacity: 0;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }
  
  @keyframes pulse-text {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
  
  .zaur-discovery-banner {
    margin: -1.8rem -1.8rem 1rem -1.8rem;
    padding: 0.8rem 1.5rem;
    background: linear-gradient(to right, #0053b3, #0070e0);
    color: white;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    border-bottom: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 3px 10px rgba(0,83,179,0.2);
  }
  
  .zaur-discovery-icon {
    font-size: 1.2rem;
  }
  
  .zaur-emphasis-indicator {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 16px;
    height: 16px;
    z-index: 2;
  }
  
  .zaur-emphasis-pulse {
    display: block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff9500;
    animation: emphasis-pulse 2s infinite;
  }
  
  @keyframes emphasis-pulse {
    0% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 0 rgba(255, 149, 0, 0.7); }
    70% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 0 10px rgba(255, 149, 0, 0); }
    100% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 0 rgba(255, 149, 0, 0); }
  }
  
  .zaur-thinking {
    width: 50px;
    height: 50px;
    background: conic-gradient(#0053b3, #80b3ff);
    border-radius: 50%;
    animation: thinking 2s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes thinking {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .zaur-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #555;
  }
  
  .zaur-error-message {
    padding: 2rem;
    text-align: center;
    color: #e63946;
  }
  
  .zaur-error-message button {
    background: #0053b3;
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 20px;
    margin-top: 1rem;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .zaur-empty-state {
    padding: 3rem;
    text-align: center;
    color: #888;
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
  
  .zaur-news-item {
    padding: 1.8rem;
    border-radius: 10px;
    background: #f9f9f9;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-left: 4px solid #0053b3;
    position: relative;
  }
  
  .zaur-news-item.just-discovered {
    box-shadow: 0 5px 25px rgba(0, 83, 179, 0.15);
    background: linear-gradient(to bottom, #f5f9ff, #f9f9f9);
    border-color: #0070e0;
  }
  
  .zaur-news-item.is-removing {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.7s ease-out, transform 0.7s ease-out;
    pointer-events: none;
  }
  
  .zaur-news-item.is-emphasized {
    box-shadow: 0 5px 20px rgba(255, 149, 0, 0.15);
    border-color: #ff9500;
    animation: gentle-highlight 3s;
  }
  
  @keyframes gentle-highlight {
    0% { background-color: #f9f9f9; }
    30% { background-color: #fff9e6; }
    100% { background-color: #f9f9f9; }
  }
  
  .zaur-news-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  }
  
  .zaur-news-item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.8rem;
    font-size: 0.85rem;
  }
  
  .zaur-news-source {
    color: #0053b3;
    font-weight: 600;
  }
  
  .zaur-news-date {
    color: #888;
  }
  
  .zaur-news-title {
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
    line-height: 1.4;
  }
  
  .zaur-news-title a {
    color: #333;
    text-decoration: none;
    transition: color 0.2s;
  }
  
  .zaur-news-title a:hover {
    color: #0053b3;
  }
  
  .zaur-news-summary {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    line-height: 1.6;
    color: #444;
  }
  
  .zaur-comment {
    margin: 1rem 0;
    padding: 0.8rem 1rem;
    background: rgba(0, 83, 179, 0.05);
    border-radius: 8px;
    font-size: 0.95rem;
    color: #444;
    line-height: 1.4;
    border-left: 3px solid #0053b3;
    transition: all 0.3s ease;
  }
  
  .zaur-comment.is-emphasized {
    background: rgba(255, 149, 0, 0.08);
    border-left-color: #ff9500;
  }
  
  .zaur-comment-prefix {
    font-weight: 600;
    color: #0053b3;
  }
  
  .zaur-news-image {
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    max-width: 100%;
    height: 200px;
  }
  
  .zaur-news-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  
  .zaur-news-item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 1rem;
    font-size: 0.9rem;
  }
  
  .zaur-news-author {
    color: #666;
    font-style: italic;
  }
  
  .zaur-read-more {
    color: #0053b3;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
    padding: 0.5rem 1rem;
    background: rgba(0, 83, 179, 0.08);
    border-radius: 20px;
  }
  
  .zaur-read-more:hover {
    color: white;
    background: #0053b3;
  }
  
  /* Responsive styles */
  @media (min-width: 768px) {
    .zaur-news-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
    }
  }
  
  @media (max-width: 600px) {
    .zaur-news-item-header {
      flex-direction: column;
      gap: 0.3rem;
    }
    
    .zaur-news-item-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.8rem;
    }
    
    .zaur-read-more {
      align-self: flex-end;
    }
  }
</style> 