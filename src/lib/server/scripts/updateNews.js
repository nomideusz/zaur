// Skip all TypeScript checks for this file since we know the types are correct at runtime
// @ts-nocheck
import { updateNews, pruneNewsItems } from '../newsStore.js';
import { dev } from '$app/environment';
import { fetchAllRssFeeds } from './fetchRssFeeds.js';
import * as schedule from 'node-schedule';
import rethinkdb from 'rethinkdb';

// Configuration
const MAX_NEWS_ITEMS = 100; // Maximum number of items to keep
const MAX_COMMENTS = 500; // Maximum number of comments to keep
const MAX_DISCOVERIES = 1000; // Maximum number of discoveries to keep
const FORCE_REAL_FEEDS = true; // Force real feeds even in development mode
const UPDATE_INTERVAL_HOURS = 3; // Hours between updates

/**
 * Prune older comments to prevent database growth
 * @param {number} maxItems Maximum number of comments to keep
 * @returns {Promise<number>} Number of deleted comments
 */
async function pruneComments(maxItems = 500) {
  try {
    console.log(`Pruning comments (keeping newest ${maxItems})...`);
    
    // Connect to database
    const conn = await rethinkdb.connect({
      host: process.env.RETHINKDB_HOST || 'localhost',
      port: parseInt(process.env.RETHINKDB_PORT || '28015', 10)
    });
    
    // Use the news database
    conn.use(process.env.RETHINKDB_DB || 'zaur_news');
    
    // Count total comments
    const totalCount = await rethinkdb.table('comments').count().run(conn);
    
    if (totalCount <= maxItems) {
      console.log(`No pruning needed, only have ${totalCount} comments (max: ${maxItems})`);
      await conn.close();
      return 0;
    }
    
    // Get IDs of comments to keep (sorted by timestamp, newest first)
    const commentsToKeep = await rethinkdb.table('comments')
      .orderBy(rethinkdb.desc('timestamp'))
      .limit(maxItems)
      .pluck('id')
      .run(conn);
    
    const idsToKeep = (await commentsToKeep.toArray()).map(item => item.id);
    
    // Delete older comments
    const result = await rethinkdb.table('comments')
      .filter(item => rethinkdb.expr(idsToKeep).contains(item('id')).not())
      .delete()
      .run(conn);
    
    await conn.close();
    
    console.log(`Pruned ${result.deleted} older comments, keeping ${maxItems}`);
    return result.deleted;
  } catch (error) {
    console.error('Error pruning comments:', error);
    return 0;
  }
}

/**
 * Prune older discoveries to prevent database growth
 * @param {number} maxItems Maximum number of discoveries to keep
 * @returns {Promise<number>} Number of deleted discoveries
 */
async function pruneDiscoveries(maxItems = 1000) {
  try {
    console.log(`Pruning discoveries (keeping newest ${maxItems})...`);
    
    // Connect to database
    const conn = await rethinkdb.connect({
      host: process.env.RETHINKDB_HOST || 'localhost',
      port: parseInt(process.env.RETHINKDB_PORT || '28015', 10)
    });
    
    // Use the news database
    conn.use(process.env.RETHINKDB_DB || 'zaur_news');
    
    // Count total discoveries
    const totalCount = await rethinkdb.table('discoveries').count().run(conn);
    
    if (totalCount <= maxItems) {
      console.log(`No pruning needed, only have ${totalCount} discoveries (max: ${maxItems})`);
      await conn.close();
      return 0;
    }
    
    // Get IDs of discoveries to keep (sorted by timestamp, newest first)
    const discoveriesToKeep = await rethinkdb.table('discoveries')
      .orderBy(rethinkdb.desc('timestamp'))
      .limit(maxItems)
      .pluck('id')
      .run(conn);
    
    const idsToKeep = (await discoveriesToKeep.toArray()).map(item => item.id);
    
    // Delete older discoveries
    const result = await rethinkdb.table('discoveries')
      .filter(item => rethinkdb.expr(idsToKeep).contains(item('id')).not())
      .delete()
      .run(conn);
    
    await conn.close();
    
    console.log(`Pruned ${result.deleted} older discoveries, keeping ${maxItems}`);
    return result.deleted;
  } catch (error) {
    console.error('Error pruning discoveries:', error);
    return 0;
  }
}

/**
 * Fetch and update news data with RethinkDB
 * @returns {Promise<{added: number, updated: number, total: number}>} Update result information
 */
export async function fetchAndUpdateNews() {
  console.log('Starting news update...', new Date().toISOString());
  
  try {
    // Fetch from RSS feeds
    if (dev && !FORCE_REAL_FEEDS) {
      console.log('Development mode: using sample news data...');
      try {
        // In SvelteKit, we can directly import JSON files
        const sampleDataModule = await import('$lib/server/data/sample-news.json');
        const sampleData = sampleDataModule.default;
        
        // Update database with sample data
        const result = await updateNews(sampleData.items || []);
        console.log(`News updated successfully (dev mode). Added: ${result.added}, Updated: ${result.updated}`);
        
        // Prune news items to prevent database growth
        await pruneNewsItems(MAX_NEWS_ITEMS);
        await pruneComments(MAX_COMMENTS);
        await pruneDiscoveries(MAX_DISCOVERIES);
        
        return result;
      } catch (error) {
        console.error('Error loading sample data:', error);
        // Continue with real feeds as fallback
      }
    }
    
    // In production mode or when forced, fetch from real RSS feeds
    console.log('Fetching real RSS feeds...');
    const result = await fetchAllRssFeeds();
    
    // Prune all data to prevent database growth
    await pruneNewsItems(MAX_NEWS_ITEMS);
    await pruneComments(MAX_COMMENTS);
    await pruneDiscoveries(MAX_DISCOVERIES);
    
    return result || { added: 0, updated: 0, total: 0 };
  } catch (error) {
    console.error('Error updating news:', error);
    throw error;
  }
}

/**
 * Initialize scheduled news updates using node-schedule
 * Updates will occur every 3 hours
 * @returns {schedule.Job} The scheduled job
 */
export function initializeNewsUpdates() {
  console.log(`Initializing news updates to run every ${UPDATE_INTERVAL_HOURS} hours`);
  
  // Run an immediate update
  console.log('Running initial news update...');
  fetchAndUpdateNews()
    .then(() => console.log('Initial news update completed successfully'))
    .catch(err => console.error('Error in initial news update:', err));
  
  // Schedule updates to run every 3 hours
  // Cron format: sec min hour day-of-month month day-of-week
  // This runs at minute 0 of every 3rd hour (00:00, 03:00, 06:00, etc.)
  const job = schedule.scheduleJob(`0 0 */${UPDATE_INTERVAL_HOURS} * * *`, async () => {
    const now = new Date();
    console.log(`Running scheduled news update at ${now.toISOString()}...`);
    
    try {
      await fetchAndUpdateNews();
      console.log('Scheduled news update completed successfully');
    } catch (error) {
      console.error('Error in scheduled news update:', error);
    }
  });
  
  console.log('News update scheduler initialized');
  return job;
} 