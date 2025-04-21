<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { ZaurMood } from './types.js';
  
  export let zaurMood: ZaurMood = 'curious';
  export let zaurThoughts: string | null = null;
</script>

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

<style>
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
</style> 