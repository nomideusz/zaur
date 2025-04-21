// @ts-nocheck
import { initializeDatabase, closeConnection } from './newsStore.js';
import { initializeNewsUpdates } from './scripts/updateNews.js';
import fs from 'fs/promises';
import path from 'path';
import rethinkdb from 'rethinkdb';

// Track initialization state
let isInitialized = false;
let newsUpdateJob = null;

/**
 * Load sources from news.json file if they don't exist in the database
 * @returns {Promise<void>}
 */
async function initializeSources() {
  try {
    console.log('Checking if RSS sources need to be initialized...');
    
    // Connect to database
    const conn = await rethinkdb.connect({
      host: process.env.RETHINKDB_HOST || 'localhost',
      port: parseInt(process.env.RETHINKDB_PORT || '28015', 10)
    });
    
    // Use the news database
    conn.use(process.env.RETHINKDB_DB || 'zaur_news');
    
    // Check if we have any sources
    const cursor = await rethinkdb.table('sources').run(conn);
    const existingSources = await cursor.toArray();
    
    if (existingSources.length === 0) {
      console.log('No sources found in database, loading from file...');
      
      // Load sources from the news.json file
      const NEWS_SOURCES_PATH = path.join(process.cwd(), 'src', 'lib', 'server', 'data', 'news.json');
      const sourcesData = await fs.readFile(NEWS_SOURCES_PATH, 'utf-8');
      const sources = JSON.parse(sourcesData).sources || [];
      
      if (sources.length > 0) {
        console.log(`Importing ${sources.length} sources to database...`);
        await rethinkdb.table('sources').insert(sources).run(conn);
        console.log('Sources imported successfully');
      } else {
        console.warn('No sources found in news.json file');
      }
    } else {
      console.log(`Found ${existingSources.length} sources in database`);
    }
    
    // Close connection
    await conn.close();
  } catch (error) {
    console.error('Error initializing sources:', error);
  }
}

/**
 * Initialize sample comments if none exist in the database
 * @returns {Promise<void>}
 */
async function initializeSampleComments() {
  try {
    console.log('Checking if comments table needs initialization...');
    
    // Connect to database
    const conn = await rethinkdb.connect({
      host: process.env.RETHINKDB_HOST || 'localhost',
      port: parseInt(process.env.RETHINKDB_PORT || '28015', 10)
    });
    
    // Use the news database
    conn.use(process.env.RETHINKDB_DB || 'zaur_news');
    
    // Check if we have any comments
    const cursor = await rethinkdb.table('comments').run(conn);
    const existingComments = await cursor.toArray();
    
    if (existingComments.length === 0) {
      console.log('No comments found in database, adding sample comments...');
      
      // Create sample comments
      const sampleComments = [
        { 
          itemId: 'sample-1', 
          comment: 'This is a fascinating article about AI advancements. The implications for the future of work are profound.',
          timestamp: new Date().toISOString()
        },
        { 
          itemId: 'sample-2', 
          comment: 'The technical approach described here is elegant but might have scalability issues in larger deployments.',
          timestamp: new Date().toISOString()
        },
        { 
          itemId: 'sample-3', 
          comment: 'This philosophical perspective on technology raises important ethical questions we should consider.',
          timestamp: new Date().toISOString()
        }
      ];
      
      console.log(`Adding ${sampleComments.length} sample comments to database...`);
      await rethinkdb.table('comments').insert(sampleComments).run(conn);
      console.log('Sample comments added successfully');
    } else {
      console.log(`Found ${existingComments.length} existing comments in database`);
    }
    
    // Close connection
    await conn.close();
  } catch (error) {
    console.error('Error initializing sample comments:', error);
  }
}

/**
 * Initialize sample discoveries if none exist in the database
 * @returns {Promise<void>}
 */
async function initializeSampleDiscoveries() {
  try {
    console.log('Checking if discoveries table needs initialization...');
    
    // Connect to database
    const conn = await rethinkdb.connect({
      host: process.env.RETHINKDB_HOST || 'localhost',
      port: parseInt(process.env.RETHINKDB_PORT || '28015', 10)
    });
    
    // Use the news database
    conn.use(process.env.RETHINKDB_DB || 'zaur_news');
    
    // Check if we have any discoveries
    const cursor = await rethinkdb.table('discoveries').run(conn);
    const existingDiscoveries = await cursor.toArray();
    
    if (existingDiscoveries.length === 0) {
      console.log('No discoveries found in database, adding sample discoveries...');
      
      // Create sample discoveries
      const sampleDiscoveries = [
        { 
          itemId: 'sample-1',
          timestamp: new Date().toISOString() 
        },
        { 
          itemId: 'sample-2',
          timestamp: new Date().toISOString() 
        },
        { 
          itemId: 'sample-3',
          timestamp: new Date().toISOString() 
        }
      ];
      
      console.log(`Adding ${sampleDiscoveries.length} sample discoveries to database...`);
      await rethinkdb.table('discoveries').insert(sampleDiscoveries).run(conn);
      console.log('Sample discoveries added successfully');
    } else {
      console.log(`Found ${existingDiscoveries.length} existing discoveries in database`);
    }
    
    // Close connection
    await conn.close();
  } catch (error) {
    console.error('Error initializing sample discoveries:', error);
  }
}

/**
 * Initialize RethinkDB and start the news update scheduler
 * @returns {Promise<void>}
 */
export async function initializeRethinkDb() {
  if (isInitialized) {
    console.log('RethinkDB already initialized, skipping');
    return;
  }

  try {
    console.log('Initializing RethinkDB connection...');
    await initializeDatabase();
    console.log('RethinkDB initialization complete');
    
    // Make sure we have sources, comments, and discoveries
    await initializeSources();
    await initializeSampleComments();
    await initializeSampleDiscoveries();
    
    // Start the news update scheduler (every 3 hours)
    console.log('Starting news update scheduler...');
    newsUpdateJob = initializeNewsUpdates();
    
    // Mark as initialized
    isInitialized = true;
    
    // Setup cleanup on shutdown
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    
    console.log('RethinkDB and news scheduler successfully initialized');
  } catch (error) {
    console.error('Error initializing RethinkDB:', error);
    throw error;
  }
}

/**
 * Clean up resources on shutdown
 */
async function cleanup() {
  console.log('Shutting down RethinkDB connections and jobs...');
  
  if (newsUpdateJob) {
    try {
      newsUpdateJob.cancel();
      console.log('News update scheduler stopped');
    } catch (error) {
      console.error('Error stopping news update scheduler:', error);
    }
  }
  
  try {
    await closeConnection();
  } catch (error) {
    console.error('Error closing RethinkDB connection:', error);
  }
  
  console.log('Cleanup complete');
}

// Initialize on module import for SvelteKit server
initializeRethinkDb().catch(error => {
  console.error('Failed to initialize RethinkDB:', error);
}); 