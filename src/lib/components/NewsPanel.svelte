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
  let discoveredItemIds = new Set<string>();
  let zaurComments = new Map<string, string>(); // Map of itemId -> comment
  // Track last discovered items with timestamps for persistence across refreshes
  let lastDiscoveredItems: { itemId: string, timestamp: string }[] = [];
  
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
      
      // Clean up summary text - remove "Comments..." text
      let cleanSummary = item.summary;
      if (cleanSummary) {
        cleanSummary = cleanSummary
          .replace(/Comments\.\.\./g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
      }
      
      // Generate a more unique comment based on title and category
      let comment = savedComment;
      
      if (!comment) {
        const commentOptions = categoryCommentary[category] || [];
        if (commentOptions.length > 0) {
          // Use the title to deterministically select a comment
          const titleHash = hashString(item.title);
          const commentIndex = titleHash % commentOptions.length;
          const baseComment = commentOptions[commentIndex];
          
          // Add article-specific details to make the comment unique
          const specificDetails = generateSpecificComment(item.title, category);
          
          if (specificDetails && !usedComments.has(baseComment)) {
            comment = `${baseComment} ${specificDetails}`;
            usedComments.add(baseComment);
          } else {
            comment = baseComment;
          }
        }
      }
      
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
  
  // Generate a unique comment for specific article
  function generateSpecificComment(title: string, category: string): string {
    // Keywords to look for and specific responses
    const keywords: Record<string, string[]> = {
      'AI': [
        'The implications for machine learning are fascinating.',
        'This could transform how neural networks are deployed.',
        'I wonder how this compares to other AI approaches.'
      ],
      'Python': [
        'The Python ecosystem continues to evolve impressively.',
        'This could improve development workflows significantly.'
      ],
      'JavaScript': [
        'The JavaScript approach here is quite elegant.',
        'This shows the flexibility of modern JS patterns.'
      ],
      'React': [
        'The component architecture here is worth studying.',
        'This React pattern could solve many common UI problems.'
      ],
      'Rust': [
        'Rust\'s safety guarantees shine in this implementation.',
        'The performance implications here are substantial.'
      ],
      'blockchain': [
        'The distributed consensus approach is noteworthy.',
        'This addresses some common blockchain scaling issues.'
      ],
      'security': [
        'The security implications are significant.',
        'This approach to vulnerability management is thoughtful.'
      ],
      'VRAM': [
        'Memory management techniques like this are vital for efficient systems.',
        'This resource optimization approach is quite clever.'
      ],
      'performance': [
        'The performance gains described could be substantial.',
        'Optimization techniques like this catch my interest.'
      ],
      'game': [
        'The game theory aspects here are intriguing.',
        'This creates interesting dynamics worth exploring.'
      ],
      'PyTorch': [
        'The model optimization approach is quite innovative.',
        'This could make deep learning workflows more efficient.'
      ]
    };
    
    // Check if any keywords match the title
    for (const [keyword, responses] of Object.entries(keywords)) {
      if (title.includes(keyword) || title.includes(keyword.toLowerCase())) {
        const titleHash = hashString(title);
        const responseIndex = titleHash % responses.length;
        return responses[responseIndex];
      }
    }
    
    // Category-specific comments if no keyword matches
    const categorySpecific: Record<string, string[]> = {
      'dev': [
        'This implementation shows care for code quality.',
        'The technical approach demonstrates good engineering principles.',
        'This kind of solution addresses real developer pain points.'
      ],
      'ai': [
        'The data-driven approach is particularly interesting.',
        'This represents an important step for practical AI applications.',
        'The balance of theory and application here is noteworthy.'
      ],
      'crypto': [
        'The economic mechanisms at play deserve attention.',
        'This addresses important questions about decentralized systems.',
        'The technical trade-offs made here are thoughtfully considered.'
      ],
      'productivity': [
        'This could meaningfully improve workflow efficiency.',
        'The attention to user experience stands out here.',
        'The marginal gains from this approach add up significantly.'
      ]
    };
    
    if (categorySpecific[category]) {
      const titleHash = hashString(title);
      const options = categorySpecific[category];
      const index = titleHash % options.length;
      return options[index];
    }
    
    return '';
  }
  
  // Simple hash function for deterministic selection
  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
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
        
        // Calculate remaining slots after accounting for recently discovered items
        const remainingSlots = itemCount - recentlyDiscoveredItems.length;
        // Take up to half of the remaining slots for other discovered items
        const maxOtherDiscoveredSlots = Math.floor(remainingSlots / 2);
        otherDiscoveredItems.push(...sortedDiscoveredItems.slice(0, maxOtherDiscoveredSlots));
        
        if (otherDiscoveredItems.length > 0) {
          console.log(`[ZaurNews] Including ${otherDiscoveredItems.length} other discovered items`);
        }
      }
      
      // Combine all discovered items
      const allDiscoveredItems = [...recentlyDiscoveredItems, ...otherDiscoveredItems];
      
      // Calculate remaining slots for new content
      const remainingSlots = itemCount - allDiscoveredItems.length;
      
      // Get items that haven't been discovered yet
      const undiscoveredItems = allAvailableItems.filter(item => 
        !discoveredItemIds.has(item.id)
      );
      
      // Shuffle with seed for consistent results across users
      const shuffled = seededShuffle(undiscoveredItems, seed);
      
      // Ensure diverse categories deterministically for the remaining slots
      const categories = new Set<string>();
      const selectedNewItems: ZaurNewsItem[] = [];
      
      // First pass - try to get one from each category
      for (const item of shuffled) {
        const category = item.category as string;
        if (!categories.has(category)) {
          categories.add(category);
          selectedNewItems.push(item);
          if (selectedNewItems.length >= remainingSlots) break;
        }
      }
      
      // Second pass - fill in if we didn't get enough categories
      if (selectedNewItems.length < remainingSlots) {
        for (const item of shuffled) {
          if (!selectedNewItems.includes(item) && !allDiscoveredItems.some(di => di.id === item.id)) {
            selectedNewItems.push(item);
            if (selectedNewItems.length >= remainingSlots) break;
          }
        }
      }
      
      // Combine discovered and new items
      const selectedItems = [...allDiscoveredItems, ...selectedNewItems];
      
      // Track which items we've shown
      selectedItems.forEach(item => seenItemIds.add(item.id));
      
      // Update items - use custom sort that prioritizes recent discoveries
      const finalItems = sortWithDiscoveriesAtTop(selectedItems);
      
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
      
      // Do NOT apply comments here - this was causing an infinite loop
      // applyZaurComments();
      
      // Find items that haven't had reactions yet
      const unreactedItems = newsItems.filter(item => !item.hasReacted);
      
      if (unreactedItems.length === 0) {
        return; // No unreacted items to react to
      }
      
      // Use seeded random to deterministically select an item
      const selectedIndex = Math.floor(seededRandom(seed) * unreactedItems.length);
      const itemToReact = unreactedItems[selectedIndex];
      
      // Get appropriate reactions
      const category = itemToReact.category as string;
      const possibleReactions = zaurReactions[category] || zaurReactions.general;
      
      // Use seeded random to deterministically select a reaction
      const reactionIndex = Math.floor(seededRandom(seed + 1) * possibleReactions.length);
      const reaction = possibleReactions[reactionIndex];
      
      // Generate the comment
      const baseComment = itemToReact.zaurComment || "";
      const newComment = baseComment ? `${baseComment}\n\n${reaction}` : reaction;
      
      // Log the reaction process
      console.log(`[ZaurNews] Adding reaction to item ${itemToReact.id}: ${reaction}`);
      
      // Save to server first
      saveZaurComment(itemToReact.id, newComment).then(() => {
        // Update only the specific item
        updateSingleItem(itemToReact.id, { 
          hasReacted: true, 
          zaurComment: newComment
        });
      });
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
    
    if (isDiscoveryMinute && !showingDiscovery && allAvailableItems.length > 0) {
      // Generate a consistent seed based on current hour and minute
      // This ensures all users will see the same discovery at the same time
      const seed = currentHour * 100 + currentMinute;
      
      // Filter out items we've already discovered
      const undiscoveredItems = allAvailableItems.filter(item => !discoveredItemIds.has(item.id));
      
      // Only proceed if we have undiscovered items
      if (undiscoveredItems.length > 0) {
        discoverNewItem(undiscoveredItems, seed);
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
    
    // Generate a comment that's specific to this article's content
    let baseComment = "";
    const titleHash = hashString(selectedItem.title);
    
    // Get a base category comment
    const commentOptions = categoryCommentary[category] || [];
    if (commentOptions.length > 0) {
      const commentIndex = titleHash % commentOptions.length;
      baseComment = commentOptions[commentIndex];
    }
    
    // Add article-specific details
    const specificDetails = generateSpecificComment(selectedItem.title, category);
    const zaurComment = specificDetails ? `${baseComment} ${specificDetails}` : baseComment;
    
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
  onMount(async () => {
    if (browser) {
      // Load discovered items from server
      await loadDiscoveredItems();
      // Now load the news, which will use the comments we just loaded
      loadZaurNews();
      // No need to schedule full refreshes anymore
    }
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
      // First sort by publish date (newest first)
      const aDate = new Date(a.publishDate).getTime();
      const bDate = new Date(b.publishDate).getTime();
      
      // If the difference in publication time is significant (>10 minutes),
      // prioritize the newer article
      if (Math.abs(aDate - bDate) > 10 * 60 * 1000) {
        return bDate - aDate;
      }
      
      // For items published around the same time, check if they're recent discoveries
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
      
      // If we get here, sort by publish date as fallback
      return bDate - aDate;
    });
  }

  function cleanSummary(summary: string): string {
    if (!summary) return '';
    
    // Remove "Comments..." text from Hacker News articles
    summary = summary.replace(/Comments\.\.\./g, '').replace(/\s{2,}/g, ' ').trim();
    
    return summary;
  }
</script>

<!-- Add the UI template part here -->