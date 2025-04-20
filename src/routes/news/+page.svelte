<script lang="ts">
  import NewsPanel from '$lib/components/NewsPanel.svelte';
</script>

<div class="news-container">
  <header>
    <div class="header-content">
      <a href="/" class="back-link">
        <span class="back-arrow">←</span>
        Back to Home
      </a>
      <h1>News & Updates</h1>
    </div>
  </header>
  
  <div class="content">
    <NewsPanel />
    
    <div class="news-info">
      <h2>About This Section</h2>
      <p>
        Here you'll find the latest news from the world of technology, programming, and design.
        News are automatically fetched from popular RSS sources and updated regularly.
      </p>
      <p>
        You can filter news by category using the buttons above.
      </p>
    </div>
  </div>
</div>

<style>
  .news-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  
  header {
    padding: 1.5rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .back-link {
    display: flex;
    align-items: center;
    color: #0053b3;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  
  .back-link:hover {
    transform: translateX(-3px);
  }
  
  .back-arrow {
    margin-right: 0.5rem;
  }
  
  h1 {
    margin: 0;
    font-size: 1.8rem;
    color: #0053b3;
    font-weight: 700;
  }
  
  .content {
    margin-bottom: 3rem;
  }
  
  .news-info {
    background: white;
    border-radius: 10px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    margin-top: 1rem;
  }
  
  .news-info h2 {
    color: #0053b3;
    margin-top: 0;
  }
  
  @media (max-width: 600px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }
    
    h1 {
      font-size: 1.4rem;
    }
  }
</style> 