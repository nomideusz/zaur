<script lang="ts">
  export let errorMessage: string = 'Unknown error occurred';
  export let onRetry: () => void;
</script>

<div class="zaur-error-message">
  <p>Zaur encountered an issue while gathering news:</p>
  <p>{errorMessage}</p>
  <button on:click={onRetry}>Ask Zaur to try again</button>
</div>

<style>
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
</style> 