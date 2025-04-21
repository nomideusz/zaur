<script lang="ts">
  import { fade } from 'svelte/transition';
</script>

<div class="zaur-discovery-indicator" transition:fade={{ duration: 300 }}>
  <div class="zaur-discovery-pulse"></div>
  <p>Zaur is discovering something interesting...</p>
</div>

<style>
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
</style> 