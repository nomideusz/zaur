<script lang="ts">
  import type { NewsItem } from '$lib/types/news.js';
  import { getAvailableCategories } from '$lib/services/newsService.js';
  import { onMount } from 'svelte';
  
  let loading = $state(true);
  let error = $state<string | null>(null);
  let newsItems = $state<NewsItem[]>([]);
  let lastUpdated = $state<Date | null>(null);
  let selectedCategory = $state<string | null>(null);
  
  // Pobierz dostępne kategorie
  const categories = getAvailableCategories();
  
  // Funkcja do ładowania wiadomości
  async function loadNews(category?: string) {
    loading = true;
    error = null;
    
    try {
      const url = category 
        ? `/api/news?category=${encodeURIComponent(category)}` 
        : '/api/news';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`);
      }
      
      const data = await response.json();
      newsItems = data.items;
      lastUpdated = new Date(data.lastUpdated);
      selectedCategory = category || null;
    } catch (err) {
      console.error('Error loading news:', err);
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      newsItems = [];
    } finally {
      loading = false;
    }
  }
  
  // Funkcja do formatowania daty
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
  
  // Funkcja do wyboru kategorii
  function selectCategory(category?: string) {
    if (category === selectedCategory) {
      // Jeśli ta sama kategoria, wróć do wszystkich
      loadNews();
    } else {
      loadNews(category);
    }
  }
  
  // Załaduj wiadomości po pierwszym renderze
  onMount(() => {
    loadNews();
  });
</script>

<div class="news-panel">
  <div class="news-header">
    <h2>News</h2>
    
    {#if lastUpdated}
      <div class="last-updated">
        Last updated: {formatDate(lastUpdated)}
      </div>
    {/if}
    
    <div class="news-filters">
      <button 
        class="category-filter {selectedCategory === null ? 'active' : ''}" 
        onclick={() => selectCategory()}
      >
        All
      </button>
      
      {#each categories as category}
        <button 
          class="category-filter {selectedCategory === category.id ? 'active' : ''}" 
          onclick={() => selectCategory(category.id)}
        >
          {category.name}
        </button>
      {/each}
    </div>
  </div>
  
  <div class="news-content">
    {#if loading}
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Loading news...</p>
      </div>
    {:else if error}
      <div class="error-message">
        <p>Error loading news:</p>
        <p>{error}</p>
        <button onclick={() => loadNews(selectedCategory || undefined)}>
          Try again
        </button>
      </div>
    {:else if newsItems.length === 0}
      <div class="empty-state">
        <p>No news to display</p>
        {#if selectedCategory}
          <p>Try selecting a different category or check back later</p>
        {/if}
      </div>
    {:else}
      <div class="news-list">
        {#each newsItems as item}
          <div class="news-item">
            <div class="news-item-header">
              <div class="news-source">{item.source}</div>
              <div class="news-date">{formatDate(item.publishDate)}</div>
            </div>
            
            <h3 class="news-title">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            </h3>
            
            <p class="news-summary">{item.summary}</p>
            
            {#if item.imageUrl}
              <div class="news-image">
                <img src={item.imageUrl} alt={item.title} />
              </div>
            {/if}
            
            <div class="news-item-footer">
              {#if item.author}
                <div class="news-author">Author: {item.author}</div>
              {/if}
              <a href={item.url} class="read-more" target="_blank" rel="noopener noreferrer">
                Read more →
              </a>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .news-panel {
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    margin-bottom: 2rem;
  }
  
  .news-header {
    padding: 1.5rem;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .news-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    color: #0053b3;
  }
  
  .last-updated {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 1rem;
  }
  
  .news-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  .category-filter {
    background: none;
    border: 1px solid #e0e0e0;
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
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
  }
  
  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #888;
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
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .news-item {
    padding: 1.5rem;
    border-radius: 8px;
    background: #f9f9f9;
    transition: all 0.2s;
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
  }
  
  .news-date {
    color: #888;
  }
  
  .news-title {
    margin: 0 0 0.8rem 0;
    font-size: 1.2rem;
    line-height: 1.4;
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
  }
  
  .news-image {
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .news-image img {
    width: 100%;
    height: auto;
    object-fit: cover;
  }
  
  .news-item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    font-size: 0.85rem;
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
  
  /* Responsywność */
  @media (min-width: 768px) {
    .news-list {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (min-width: 1024px) {
    .news-list {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  
  @media (max-width: 600px) {
    .news-item-header {
      flex-direction: column;
      gap: 0.3rem;
    }
    
    .news-filters {
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }
    
    .category-filter {
      white-space: nowrap;
    }
  }
</style> 