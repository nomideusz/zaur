<script lang="ts">
  import { fetchAllNews, fetchNewsByCategory, getAvailableCategories } from '$lib/services/newsService.js';
  import { onMount, onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { fly, slide, scale, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { watch, useEventListener, useDebounce } from 'runed';
  import { 
    createNewsMachine, 
    createNewsHistory, 
    newsContext, 
    type NewsItemWithUI 
  } from '$lib/state/newsContext.js';
  import { animateNewItems } from '$lib/utils/newsAnimations.js';
  
  // State management using state machine
  const newsMachine = createNewsMachine();
  
  // Track component state
  let newsItems = $state<NewsItemWithUI[]>([]);
  let lastUpdated = $state<Date | null>(null);
  let selectedCategory = $state<string | null>(null);
  let isMockData = $state(false);
  let autoRefresh = $state(true);
  let refreshInterval = $state(300); // Increased to 5 minutes default
  let error = $state<string | null>(null);
  let previousItemIds = $state<Set<string>>(new Set());
  let refreshTimerId: number | null = null;
  let showHistory = $state(false);
  let consecutiveErrors = $state(0); // Track consecutive errors
  let isRefreshed = $state(false); // Track refresh button states
  
  // Create history tracker
  const newsHistory = createNewsHistory(
    () => newsItems,
    (items) => { newsItems = items; }
  );
  
  // Function to update context
  function updateContext() {
    newsContext.set({
      items: newsItems,
      state: newsMachine.current,
      lastRefreshed: lastUpdated,
      selectedCategory,
      error
    });
  }
  
  // Initial context setup
  updateContext();
  
  // Watch for newsItems changes
  watch(() => newsItems, updateContext);
  
  // Watch for state machine changes
  watch(
    () => newsMachine.current,
    (state) => {
      updateContext();
      console.log(`News state changed to: ${state}`);
    }
  );
  
  // Watch other state changes that should update context
  watch(() => lastUpdated, updateContext);
  watch(() => selectedCategory, updateContext);
  watch(() => error, updateContext);
  
  // Utility function to format dates
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
  
  // Fallback function to show example data if all sources fail
  function getExampleNewsItems(): NewsItemWithUI[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const twoHoursAgo = new Date(now.getTime() - 7200000);
    
    return [
      {
        id: 'local-javascript-1',
        title: 'Using Svelte 5 with TypeScript and Runes',
        summary: 'Learn how to leverage Svelte 5\'s new runes API with TypeScript for better reactivity and type safety in your applications.',
        url: 'https://svelte.dev/blog/runes',
        publishDate: oneHourAgo,
        source: 'Svelte Blog',
        sourceId: 'svelte',
        category: 'programming',
        author: 'Svelte Team',
        isNew: false
      },
      {
        id: 'local-tech-1',
        title: 'Building Better CORS Proxies for Frontend Applications',
        summary: 'CORS issues can be frustrating when developing frontend applications. Learn how to build and manage your own CORS proxy to avoid rate limiting and errors.',
        url: 'https://example.com/cors-proxy',
        publishDate: twoHoursAgo,
        source: 'Dev Tips',
        sourceId: 'devtips',
        category: 'tech',
        author: 'Web Dev Team',
        isNew: false
      },
      {
        id: 'local-design-1',
        title: 'Modern UI Design Patterns for News Applications',
        summary: 'Explore effective design patterns for displaying news content, including card layouts, infinite scrolling, and category navigation.',
        url: 'https://example.com/ui-news',
        publishDate: now,
        source: 'UI Patterns',
        sourceId: 'uipatterns',
        category: 'design',
        author: 'Design Systems Team',
        isNew: false
      }
    ];
  }
  
  // Function to load news from API
  async function loadNews(category?: string | null): Promise<void> {
    if (!browser) return;
    
    try {
      // Signal fetch start
      newsMachine.send('fetch');
      
      console.log(`Fetching news: category=${category}, autoRefresh=${autoRefresh}`);
      
      const result = category 
        ? await fetchNewsByCategory(category)
        : await fetchAllNews();
      
      // Signal successful fetch
      newsMachine.send('success');
      
      console.log(`News fetch result:`, {
        itemCount: result.items.length,
        isMock: result.isMock,
        timestamp: result.lastUpdated
      });
      
      // Reset error counter on success
      consecutiveErrors = 0;
      
      // Track current items for animation purposes
      const currentIds = new Set(newsItems.map(item => item.id));
      
      // Update metadata
      lastUpdated = result.lastUpdated;
      isMockData = result.isMock === true;
      
      // Mark new items
      const processedItems = result.items.map(item => ({
        ...item,
        isNew: !currentIds.has(item.id) && newsItems.length > 0
      }));
      
      // Update items
      newsItems = processedItems;
      previousItemIds = currentIds;
      
      // Record in history
      if (newsItems.length > 0) {
        // StateHistory automatically captures state changes
        // No explicit capture() method needed
      }
      
      // Animate new items after DOM update
      await tick();
      
      // Find new item elements
      const newElements = [...document.querySelectorAll('.news-item.is-new')];
      if (newElements.length > 0) {
        animateNewItems(newElements, {
          duration: 600,
          staggerDelay: 150
        });
      }
      
      // Clear new item flags after animation
      setTimeout(() => {
        newsItems = newsItems.map(item => ({
          ...item,
          isNew: false
        }));
      }, 3000);
      
      // Signal refresh complete
      newsMachine.send('complete');
    } catch (err) {
      console.error('Error loading news:', err);
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Increment consecutive error counter
      consecutiveErrors++;
      
      // If we have multiple consecutive errors, increase the refresh interval temporarily
      if (consecutiveErrors > 2 && refreshInterval < 600) {
        console.log(`Increasing refresh interval due to ${consecutiveErrors} consecutive errors`);
        refreshInterval = Math.min(refreshInterval * 2, 1800); // Up to 30 minutes max
      }
      
      // After 5 consecutive errors, if no news is shown, use local example data
      if (consecutiveErrors >= 5 && newsItems.length === 0) {
        console.log('Showing example news data after multiple fetch failures');
        newsItems = getExampleNewsItems();
        lastUpdated = new Date();
        isMockData = true;
      }
      
      // Signal error state
      newsMachine.send('error');
    }
  }
  
  // Schedule next refresh with debounce
  function scheduleNextRefresh(interval: number): void {
    if (refreshTimerId !== null) {
      window.clearTimeout(refreshTimerId);
      refreshTimerId = null;
    }
    
    if (autoRefresh && browser) {
      console.log(`Scheduling next refresh in ${interval} seconds`);
      refreshTimerId = window.setTimeout(() => {
        console.log('Auto-refreshing news');
        if (autoRefresh) { 
          loadNews(selectedCategory);
        }
      }, interval * 1000);
    }
  }
  
  // Watch for category changes to reload data
  watch(
    () => selectedCategory,
    (category) => {
      if (browser) {
        loadNews(category);
        scheduleNextRefresh(refreshInterval);
      }
    }
  );
  
  // Watch refresh interval changes
  watch(
    () => refreshInterval,
    (interval) => {
      if (autoRefresh) {
        scheduleNextRefresh(interval);
      }
    },
    { lazy: true }
  );
  
  // Watch auto-refresh toggle changes
  watch(
    () => autoRefresh,
    (isEnabled) => {
      if (isEnabled) {
        scheduleNextRefresh(refreshInterval);
      } else if (refreshTimerId !== null) {
        window.clearTimeout(refreshTimerId);
        refreshTimerId = null;
      }
    },
    { lazy: true }
  );
  
  // Select category function
  function selectCategory(category?: string) {
    if (category === selectedCategory) {
      selectedCategory = null;
    } else {
      selectedCategory = category || null;
    }
  }
  
  // Toggle auto-refresh
  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
  }
  
  // Manual refresh
  async function manualRefresh() {
    // Prepare for a full refresh - clear any caches if needed
    error = null;
    
    // Force reinitialization of any services that might be in a bad state
    if (isMockData) {
      console.log('Attempting to force real data fetch...');
      
      // Try importing the RSS parser module directly to trigger re-initialization
      if (browser) {
        try {
          // Try importing the RSS parser module directly to trigger re-initialization
          await import('rss-parser');
          console.log('RSS parser module successfully imported directly');
        } catch (err) {
          console.warn('Could not directly import RSS parser:', err);
        }
      }
      
      // Try disabling and re-enabling auto-refresh to reset timers
      if (autoRefresh) {
        console.log('Recycling auto-refresh state');
        autoRefresh = false;
        // Short delay to let state update
        await new Promise(resolve => setTimeout(resolve, 50));
        autoRefresh = true;
      }
      
      // Add a small delay to ensure any pending operations complete
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('Starting news fetch (manual refresh)');
    
    // Perform the news fetch
    await loadNews(selectedCategory);
    scheduleNextRefresh(refreshInterval);
    
    // Show success state 
    isRefreshed = true;
    setTimeout(() => {
      isRefreshed = false;
    }, 1000);
  }
  
  // Toggle history view
  function toggleHistory() {
    showHistory = !showHistory;
  }
  
  // Add keyboard shortcut for refresh (Ctrl+R) - only in browser
  $effect(() => {
    if (browser) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === 'r') {
          event.preventDefault();
          manualRefresh();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  });
  
  // Cleanup on component destroy
  onDestroy(() => {
    if (refreshTimerId !== null && browser) {
      window.clearTimeout(refreshTimerId);
      refreshTimerId = null;
    }
  });
  
  // Initial load
  onMount(() => {
    manualRefresh();
  });
  
  // Pagination for category buttons on small screens
  let categoryContainer: HTMLElement;
  let scrolled = $state(false);
  
  function scrollCategories(direction: 'left' | 'right') {
    if (!categoryContainer) return;
    
    const scrollAmount = direction === 'left' ? -200 : 200;
    categoryContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    
    // Mark as scrolled for indicator visibility
    scrolled = true;
  }
</script>

<div class="news-panel" class:state-idle={newsMachine.current === 'idle'} 
                         class:state-fetching={newsMachine.current === 'fetching'}
                         class:state-refreshing={newsMachine.current === 'refreshing'}
                         class:state-error={newsMachine.current === 'error'}>
  <div class="news-header">
    <div class="header-top">
      <h2>News</h2>
      
      <div class="action-buttons">
        <label class="auto-refresh-toggle">
          <input type="checkbox" bind:checked={autoRefresh} onchange={toggleAutoRefresh}>
          <span>Auto-refresh</span>
        </label>
        
        <select bind:value={refreshInterval} disabled={!autoRefresh}>
          <option value={60}>1m</option>
          <option value={300}>5m</option>
          <option value={600}>10m</option>
          <option value={1800}>30m</option>
        </select>
        
        <button class="refresh-button" 
                class:refreshed={isRefreshed}
                class:refreshing={newsMachine.current === 'fetching'}
                onclick={manualRefresh} 
                disabled={newsMachine.current === 'fetching'}
                title="Refresh news (Ctrl+R)">
          <div class="button-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </div>
          <span class="button-text">Refresh</span>
        </button>
      
        {#if newsHistory.canUndo}
          <button class="history-button" onclick={newsHistory.undo} title="View previous news state">
            <div class="button-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 9l-6 6 6 6"></path>
              </svg>
            </div>
            <span class="button-text">Previous</span>
          </button>
        {/if}
        
        {#if newsHistory.canRedo}
          <button class="history-button" onclick={newsHistory.redo} title="View newer news state">
            <div class="button-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 15l6-6-6-6"></path>
              </svg>
            </div>
            <span class="button-text">Next</span>
          </button>
        {/if}
      </div>
    </div>
    
    {#if lastUpdated}
      <div class="last-updated">
        Last updated: {formatDate(lastUpdated)}
        {#if isMockData}
          <span class="mock-data-badge">Using Demo Data</span>
          <button 
            class="try-real-data-button" 
            onclick={manualRefresh}
            disabled={newsMachine.current === 'fetching'}>
            Try Loading Real Data
          </button>
        {/if}
      </div>
    {/if}
    
    <div class="news-filters-container">
      {#if scrolled}
        <button class="scroll-button left" 
                onclick={() => scrollCategories('left')}
                aria-label="Scroll categories left">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
      {/if}
      
      <div class="news-filters" bind:this={categoryContainer}>
        <button 
          class="category-filter {selectedCategory === null ? 'active' : ''}" 
          onclick={() => selectCategory()}
        >
          All
        </button>
        
        {#each getAvailableCategories() as category}
          <button 
            class="category-filter {selectedCategory === category.id ? 'active' : ''}" 
            onclick={() => selectCategory(category.id)}
          >
            {category.name}
          </button>
        {/each}
      </div>
      
      <button class="scroll-button right" 
              onclick={() => scrollCategories('right')}
              aria-label="Scroll categories right">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    </div>
  </div>
  
  <div class="news-content">
    {#if newsItems.length === 0 && newsMachine.current === 'fetching'}
      <div class="initial-loading" transition:fade={{ duration: 200 }}>
        <div class="spinner"></div>
        <p>Loading news...</p>
      </div>
    {:else if error && newsItems.length === 0}
      <div class="error-message">
        <p>Error loading news:</p>
        <p>{error}</p>
        <button onclick={manualRefresh}>
          Try again
        </button>
      </div>
    {:else if newsItems.length === 0}
      <div class="empty-state">
        <p>No news to display</p>
        {#if selectedCategory}
          <p>Try selecting a different category or check back later</p>
        {:else}
          <p>This could be due to a network issue or CORS restrictions.</p>
          <button onclick={manualRefresh}>
            Try Refresh Again
          </button>
        {/if}
      </div>
    {:else}
      <div class="news-list" class:is-refreshing={newsMachine.current === 'refreshing'}>
        {#each newsItems as item (item.id)}
          <div 
            id={item.id}
            class="news-item" 
            class:is-new={item.isNew}
            class:is-viewing={showHistory && item.isViewed}
            animate:flip={{ duration: 300 }}
          >
            <div class="news-item-header">
              <div class="news-source" class:tech={item.category === 'tech'} 
                  class:programming={item.category === 'programming'}
                  class:design={item.category === 'design'}
                  class:products={item.category === 'products'}
                  class:business={item.category === 'business'}
                  class:science={item.category === 'science'}>
                {item.source}
                {#if item.isNew}
                  <span class="new-indicator" transition:fade={{ duration: 300 }}>NEW</span>
                {/if}
              </div>
              <div class="news-date">{formatDate(item.publishDate)}</div>
            </div>
            
            <h3 class="news-title">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            </h3>
            
            {#if item.summary && item.summary.trim() !== ''}
              <p class="news-summary" class:hacker-news={item.sourceId === 'techmeme'}>
                {#if item.summary.includes("<p>") || item.summary.includes("Points:") || item.summary.includes("Comments:")}
                  <!-- Special handling for badly formatted content -->
                  View the full article for more details.
                {:else}
                  {item.summary}
                {/if}
              </p>
            {/if}
            
            {#if item.imageUrl}
              <div class="news-image">
                <img src={item.imageUrl} alt={item.title} loading="lazy" />
              </div>
            {/if}
            
            <div class="news-item-footer">
              {#if item.author && item.author !== 'unknown' && !item.author.includes('http')}
                <div class="news-author">Author: {item.author}</div>
              {:else}
                <div class="news-source-tag">{item.source}</div>
              {/if}
              <div class="news-item-category" class:tech={item.category === 'tech'} 
                   class:programming={item.category === 'programming'}
                   class:design={item.category === 'design'}
                   class:products={item.category === 'products'}
                   class:business={item.category === 'business'}
                   class:science={item.category === 'science'}>
                {item.category}
              </div>
              <a href={item.url} class="read-more" target="_blank" rel="noopener noreferrer">
                Read more →
              </a>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Refreshing indicator that appears in the corner instead of overlay -->
  {#if newsMachine.current === 'fetching' && newsItems.length > 0}
    <div class="refresh-indicator" transition:fade={{ duration: 200 }}>
      <div class="spinner small"></div>
      <span>Updating...</span>
    </div>
  {/if}
</div>

<style>
  .news-panel {
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    margin-bottom: 2rem;
    max-width: 100%;
    position: relative;
    transition: all 0.3s ease;
  }
  
  /* State-specific styles */
  .news-panel.state-fetching {
    box-shadow: 0 2px 8px rgba(0, 83, 179, 0.1);
  }
  
  .news-panel.state-refreshing .news-list {
    opacity: 0.8;
    transition: opacity 0.5s ease;
  }
  
  .news-panel.state-error {
    box-shadow: 0 2px 8px rgba(229, 57, 53, 0.1);
  }
  
  .news-header {
    padding: 1.5rem;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .news-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #0053b3;
  }
  
  .news-list.is-refreshing {
    opacity: 0.7;
    transition: opacity 0.3s ease;
  }
  
  .refresh-indicator {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 83, 179, 0.9);
    color: white;
    padding: 10px 16px;
    border-radius: 30px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
    font-size: 0.9rem;
    z-index: 1000;
  }
  
  .button-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid rgba(0, 83, 179, 0.1);
    border-radius: 50%;
    border-top-color: #0053b3;
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .spinner.small {
    width: 16px;
    height: 16px;
    border-width: 2px;
    margin: 0;
  }
  
  /* Animation states for news items */
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .is-new {
    box-shadow: 0 0 15px rgba(0, 83, 179, 0.3);
    animation: pulse 2s;
  }
  
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(0, 83, 179, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(0, 83, 179, 0); }
    100% { box-shadow: 0 0 0 0 rgba(0, 83, 179, 0); }
  }
  
  .new-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: #ff3d00;
    color: white;
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
    border-radius: 2px;
    margin-left: 0.5rem;
    font-weight: bold;
    animation: blink 1s infinite;
  }
  
  @keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  
  .action-buttons {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
  }
  
  .auto-refresh-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #555;
    margin-right: 1rem;
    cursor: pointer;
  }
  
  .action-buttons select {
    padding: 0.25rem;
    border-radius: 4px;
    border: 1px solid #ddd;
    font-size: 0.85rem;
  }
  
  .refresh-button, .history-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 44px;
    background: #0053b3;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.2s, transform 0.1s;
  }
  
  .refresh-button:hover, .history-button:hover {
    background: #003b80;
  }
  
  .refresh-button:active, .history-button:active {
    transform: scale(0.95);
  }
  
  .refresh-button.refreshed {
    background-color: #4caf50;
    animation: pulse-success 1s ease;
  }
  
  .refresh-button.refreshing {
    background-color: #ff9800;
    animation: pulse 1s infinite;
  }
  
  @keyframes pulse-success {
    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
  }
  
  .refresh-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .history-button {
    background: #555;
  }
  
  .history-button:hover {
    background: #333;
  }
  
  .last-updated {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .mock-data-badge {
    background-color: #ffd700;
    color: #333;
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-weight: bold;
  }
  
  .try-real-data-button {
    background-color: #4caf50;
    color: white;
    border: none;
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    cursor: pointer;
    margin-left: 0.5rem;
    font-weight: bold;
    transition: background-color 0.2s ease;
  }
  
  .try-real-data-button:hover {
    background-color: #388e3c;
  }
  
  .try-real-data-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .news-filters-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .scroll-button {
    position: absolute;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 5;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.2s;
  }
  
  .scroll-button:hover {
    background: #f5f5f5;
  }
  
  .scroll-button.left {
    left: 0;
  }
  
  .scroll-button.right {
    right: 0;
  }
  
  .news-filters {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.5rem;
    margin-top: 1rem;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 0.3rem;
    padding: 0 2rem;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    scroll-behavior: smooth;
  }
  
  .news-filters::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
  
  .category-filter {
    background: none;
    border: 1px solid #e0e0e0;
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  .category-filter:hover {
    background: #f5f5f5;
  }
  
  .category-filter.active {
    background: #0053b3;
    color: white;
    border-color: #0053b3;
  }
  
  .news-content {
    padding: 1rem;
    overflow: hidden;
    min-height: 200px;
  }
  
  .initial-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #888;
  }
  
  .error-message {
    padding: 2rem;
    text-align: center;
    color: #e63946;
  }
  
  .error-message button {
    background: #0053b3;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    margin-top: 1rem;
    cursor: pointer;
  }
  
  .empty-state {
    padding: 2rem;
    text-align: center;
    color: #888;
  }
  
  .news-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  
  .news-item {
    padding: 1.5rem;
    border-radius: 8px;
    background: #f9f9f9;
    transition: all 0.2s;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .news-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  .news-item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.8rem;
    font-size: 0.8rem;
  }
  
  .news-source {
    color: #0053b3;
    font-weight: 600;
    position: relative;
    padding-left: 0.5rem;
  }
  
  /* Add colored borders for different categories */
  .news-source.tech {
    color: #6200ea;
    border-left: 3px solid #6200ea;
  }
  
  .news-source.programming {
    color: #2962ff;
    border-left: 3px solid #2962ff;
  }
  
  .news-source.design {
    color: #00c853;
    border-left: 3px solid #00c853;
  }
  
  .news-source.products {
    color: #ff6d00;
    border-left: 3px solid #ff6d00;
  }
  
  .news-source.business {
    color: #c51162;
    border-left: 3px solid #c51162;
  }
  
  .news-source.science {
    color: #00bfa5;
    border-left: 3px solid #00bfa5;
  }
  
  .news-date {
    color: #888;
  }
  
  .news-title {
    margin: 0 0 0.8rem 0;
    font-size: 1.2rem;
    line-height: 1.4;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  
  .news-title a {
    color: #333;
    text-decoration: none;
    transition: color 0.2s;
  }
  
  .news-title a:hover {
    color: #0053b3;
  }
  
  .news-summary {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: #555;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  
  .news-summary.hacker-news {
    font-style: italic;
    color: #555;
    background-color: #f5f5f5;
    padding: 0.5rem;
    border-left: 3px solid #0053b3;
    margin-bottom: 1rem;
  }
  
  .news-image {
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    max-width: 100%;
    height: 160px;
  }
  
  .news-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  
  .news-item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 1rem;
    font-size: 0.85rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .news-item-footer .read-more {
    margin-left: auto;
  }
  
  .news-author {
    color: #666;
    font-style: italic;
  }
  
  .read-more {
    color: #0053b3;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }
  
  .read-more:hover {
    color: #e63946;
  }
  
  .news-source-tag {
    color: #666;
    font-size: 0.85rem;
    background-color: #f0f0f0;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }
  
  .news-item-category {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background-color: #f0f0f0;
    color: #555;
  }
  
  .news-item-category.tech {
    background-color: rgba(98, 0, 234, 0.1);
    color: #6200ea;
  }
  
  .news-item-category.programming {
    background-color: rgba(41, 98, 255, 0.1);
    color: #2962ff;
  }
  
  .news-item-category.design {
    background-color: rgba(0, 200, 83, 0.1);
    color: #00c853;
  }
  
  .news-item-category.products {
    background-color: rgba(255, 109, 0, 0.1);
    color: #ff6d00;
  }
  
  .news-item-category.business {
    background-color: rgba(197, 17, 98, 0.1);
    color: #c51162;
  }
  
  .news-item-category.science {
    background-color: rgba(0, 191, 165, 0.1);
    color: #00bfa5;
  }
  
  /* Responsywność */
  @media (min-width: 768px) {
    .news-list {
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }
    
    .button-text {
      display: inline;
    }
  }
  
  @media (min-width: 1200px) {
    .news-list {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }
  }
  
  @media (max-width: 768px) {
    .header-top {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
    
    .action-buttons {
      justify-content: space-between;
    }
    
    .button-text {
      display: none;
    }
    
    .refresh-button, .history-button {
      min-width: 36px;
      padding: 0.5rem;
    }
  }
  
  @media (max-width: 600px) {
    .news-item-header {
      flex-direction: column;
      gap: 0.3rem;
    }
    
    .news-filters-container {
      margin: 0 -1rem;
      width: calc(100% + 2rem);
    }
    
    .news-filters {
      padding: 0 3rem;
    }
    
    .news-item-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .news-item-footer .read-more {
      margin-left: 0;
      align-self: flex-end;
    }
  }
</style> 