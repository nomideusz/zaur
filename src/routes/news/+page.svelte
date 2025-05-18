<script lang="ts">
  import NewsPanel from '$lib/components/news/NewsPanel.svelte';
</script>

<div class="news-container">
  <header>
    <div class="header-content">
      <a href="/" class="back-link">
        <span class="back-arrow">←</span>
        Back to Home
      </a>
      <h1>Zaur's Digital Collection</h1>
    </div>
  </header>
  
  <div class="content">
    <div class="intro-message">
      <p>
        This is where Zaur shares things that catch his attention from across the digital landscape.
        Watch for new discoveries throughout the day.
      </p>
    </div>
    
    <NewsPanel />
    
    <div class="news-info">
      <h2>About This Space</h2>
      <p>
        Zaur is constantly exploring the digital realm, searching for content worth sharing. 
        Unlike traditional news feeds that overwhelm you with information, Zaur carefully 
        curates a small selection of items he finds most valuable.
      </p>
      <p>
        As you spend time here, you'll notice Zaur's personality shine through - he develops preferences 
        for certain topics, occasionally emphasizes articles he finds particularly interesting, and 
        sometimes adds new thoughts to pieces he's been contemplating. His discoveries are dynamic and 
        evolve with his moods.
      </p>
      <p>
        Check back throughout the day to see what new gems Zaur has uncovered for you.
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
    border-bottom: 1px solid rgba(0, 83, 179, 0.15);
    margin-bottom: 1.5rem;
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
  
  .intro-message {
    background: linear-gradient(to right, rgba(0, 83, 179, 0.05), rgba(0, 83, 179, 0.01));
    border-left: 3px solid #0053b3;
    padding: 1rem 1.5rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 1.05rem;
    color: #444;
  }
  
  .news-info {
    background: white;
    border-radius: 10px;
    padding: 1.8rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    margin-top: 2rem;
    border: 1px solid rgba(0, 83, 179, 0.08);
  }
  
  .news-info h2 {
    color: #0053b3;
    margin-top: 0;
    font-size: 1.4rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(0, 83, 179, 0.1);
  }
  
  .news-info p {
    line-height: 1.6;
    color: #444;
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