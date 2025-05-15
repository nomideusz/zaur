<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import { formatDate } from './utils.js';
  import type { ZaurNewsItem } from './types.js';
  import { createEventDispatcher } from 'svelte';

  // Define the props
  export let item: ZaurNewsItem;
  export let index: number;
  export let activeShareItem: string | null;
  export let isShareMenuVisible: boolean = false;
  
  // Create an event dispatcher
  const dispatch = createEventDispatcher();
  
  // Event handlers
  function handleShareClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    dispatch('share', { id: item.id, event });
  }
  
  function handleShareVia(platform: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    dispatch('shareVia', { platform, item, event });
  }
</script>

<div 
  id={item.id}
  class="zaur-news-item" 
  class:just-discovered={item.justDiscovered}
  class:is-removing={item.isRemoving}
  class:is-emphasized={item.isEmphasized}
  transition:fly={{ y: 20, duration: 400, delay: index * 150 }}
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
        onclick={handleShareClick}
        aria-label="Share this article"
      >
        <span class="zaur-share-icon">📤</span>
        <span class="zaur-share-text">Share</span>
      </button>
      
      {#if activeShareItem === item.id && isShareMenuVisible}
        <div class="zaur-share-menu" transition:scale={{ start: 0.8, duration: 200 }}>
          <button class="zaur-share-option" onclick={(e) => handleShareVia('twitter', e)}>
            Twitter
          </button>
          <button class="zaur-share-option" onclick={(e) => handleShareVia('linkedin', e)}>
            LinkedIn
          </button>
          <button class="zaur-share-option" onclick={(e) => handleShareVia('facebook', e)}>
            Facebook
          </button>
          <button id="share-{item.id}" class="zaur-share-option" onclick={(e) => handleShareVia('copy', e)}>
            Copy Link
          </button>
          {#if typeof navigator !== 'undefined' && typeof navigator.share === 'function'}
            <button class="zaur-share-option" onclick={(e) => handleShareVia('share', e)}>
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

<style>
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
  
  .zaur-news-meta {
    display: flex;
    align-items: center;
  }
  
  .zaur-news-author {
    color: #666;
    font-style: italic;
  }
  
  .zaur-news-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
  }
  
  .zaur-share-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    color: #0053b3;
    font-size: 0.9rem;
    padding: 0.5rem;
    border-radius: 20px;
    transition: all 0.2s;
  }
  
  .zaur-share-button:hover {
    background: rgba(0, 83, 179, 0.08);
  }
  
  .zaur-share-icon {
    font-size: 1rem;
  }
  
  .zaur-share-menu {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    min-width: 160px;
    z-index: 10;
    margin-bottom: 5px;
    border: 1px solid #eee;
  }
  
  .zaur-share-option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.8rem 1rem;
    background: none;
    border: none;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
    color: #333;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .zaur-share-option:last-child {
    border-bottom: none;
  }
  
  .zaur-share-option:hover {
    background: #f5f9ff;
    color: #0053b3;
  }
  
  .zaur-read-more {
    color: #0053b3;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
    padding: 0.5rem 1rem;
    background: rgba(0, 83, 179, 0.08);
    border-radius: 20px;
    white-space: nowrap;
  }
  
  .zaur-read-more:hover {
    color: white;
    background: #0053b3;
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
    
    .zaur-news-actions {
      align-self: stretch;
      justify-content: space-between;
    }
    
    .zaur-share-text {
      display: none;
    }
    
    .zaur-share-button {
      padding: 0.5rem;
    }
    
    .zaur-share-menu {
      right: 0;
      left: auto;
    }
  }
</style> 