<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let isLoading = false;
  let message = '';
  let error = '';
  let success = false;
  
  async function fetchRealNews() {
    if (isLoading) return;
    
    isLoading = true;
    message = 'Fetching real news...';
    error = '';
    success = false;
    
    try {
      const response = await fetch('/api/news/fetch', {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      message = data.message || 'Successfully fetched real news';
      success = data.success;
      
      if (success) {
        // Wait a moment to show the success message
        setTimeout(() => {
          // Refresh the page to show the new news
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch news';
      console.error('Error fetching real news:', err);
    } finally {
      // Keep the loading state a bit longer to show feedback to the user
      setTimeout(() => {
        isLoading = false;
      }, 500);
    }
  }
  
  // Optional: Auto-fetch news when the component mounts if no news is available
  onMount(() => {
    // You could check if there are news items available and fetch if not
    // For now, we'll just leave it to user action
  });
</script>

<div class="fetch-news-container">
  <button 
    class="fetch-news-button" 
    on:click={fetchRealNews} 
    disabled={isLoading}
    class:loading={isLoading}
    class:success={success && !isLoading}
    class:error={error && !isLoading}
  >
    {#if isLoading}
      <span class="spinner"></span>
      <span>Loading...</span>
    {:else if success}
      <span>✓</span>
      <span>News Fetched</span>
    {:else if error}
      <span>⚠</span> 
      <span>Retry</span>
    {:else}
      <span>↻</span>
      <span>Fetch Real News</span>
    {/if}
  </button>
  
  {#if message && isLoading}
    <div class="message">{message}</div>
  {/if}
  
  {#if error}
    <div class="error-message">{error}</div>
  {/if}
</div>

<style>
  .fetch-news-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20px 0;
  }
  
  .fetch-news-button {
    background-color: #0053b3;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  }
  
  .fetch-news-button:hover {
    background-color: #003b80;
  }
  
  .fetch-news-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .fetch-news-button.loading {
    background-color: #4a9d5f;
  }
  
  .fetch-news-button.success {
    background-color: #4a9d5f;
  }
  
  .fetch-news-button.error {
    background-color: #e63946;
  }
  
  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .message {
    margin-top: 10px;
    font-size: 14px;
    color: #666;
  }
  
  .error-message {
    margin-top: 10px;
    font-size: 14px;
    color: #e63946;
  }
</style> 