<script lang="ts">
  import { fade } from 'svelte/transition';
</script>

<div class="zaur-loading" transition:fade={{ duration: 200 }}>
  <div class="zaur-thinking"></div>
  <p>Zaur is curating content for you...</p>
</div>

<style>
  .zaur-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #555;
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
</style> 