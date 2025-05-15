// @ts-nocheck
/**
 * Script to check and verify the RethinkDB data for comments, discoveries, and news items
 * Run with: node src/lib/server/check-rethinkdb-data.js
 */

import { getConnection, closeConnection, getDiscoveredItems, getComments, getNewsItems } from './db.js';
import rethinkdb from 'rethinkdb';

// Configuration from environment variables or defaults
const config = {
  host: process.env.RETHINKDB_HOST || 'localhost',
  port: parseInt(process.env.RETHINKDB_PORT || '28015', 10),
  db: process.env.RETHINKDB_DB || 'zaur_news'
};

/**
 * Check database tables and content
 */
async function checkDatabaseTables() {
  console.log('Checking RethinkDB database tables and content...');
  console.log('-----------------------------------------------');
  
  try {
    // Connect to RethinkDB
    const conn = await getConnection();
    console.log(`Connected to RethinkDB at ${config.host}:${config.port} (database: ${config.db})`);
    
    // Check database existence
    const dbList = await rethinkdb.dbList().run(conn);
    if (dbList.includes(config.db)) {
      console.log(`✅ Database '${config.db}' exists`);
    } else {
      console.error(`❌ Database '${config.db}' does not exist!`);
      await closeConnection();
      return;
    }
    
    // Check tables
    const tables = await rethinkdb.db(config.db).tableList().run(conn);
    console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);
    
    // Check required tables
    const requiredTables = ['news', 'sources', 'comments', 'discoveries', 'categories'];
    for (const table of requiredTables) {
      if (tables.includes(table)) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.error(`❌ Table '${table}' is missing!`);
      }
    }
    
    console.log('\nChecking table content:');
    console.log('---------------------');
    
    // Check content
    if (tables.includes('news')) {
      const newsCount = await rethinkdb.db(config.db).table('news').count().run(conn);
      console.log(`News items: ${newsCount}`);
      
      if (newsCount > 0) {
        const latestNews = await rethinkdb.db(config.db)
          .table('news')
          .orderBy(rethinkdb.desc('publishDate'))
          .limit(1)
          .run(conn);
        
        const latestItem = await latestNews.next();
        console.log(`Latest news: "${latestItem.title}" (${new Date(latestItem.publishDate).toLocaleString()})`);
      }
    }
    
    if (tables.includes('sources')) {
      const sourcesCount = await rethinkdb.db(config.db).table('sources').count().run(conn);
      console.log(`Sources: ${sourcesCount}`);
      
      if (sourcesCount > 0) {
        const sources = await rethinkdb.db(config.db).table('sources').run(conn);
        const sourcesList = await sources.toArray();
        const sourceNames = sourcesList.map(s => s.name).slice(0, 5).join(', ');
        console.log(`First sources: ${sourceNames}${sourcesList.length > 5 ? ', ...' : ''}`);
      }
    }
    
    if (tables.includes('categories')) {
      const categoriesCount = await rethinkdb.db(config.db).table('categories').count().run(conn);
      console.log(`Categories: ${categoriesCount}`);
      
      if (categoriesCount > 0) {
        const categories = await rethinkdb.db(config.db).table('categories').run(conn);
        const categoriesList = await categories.toArray();
        const categoryNames = categoriesList.map(c => c.name).join(', ');
        console.log(`Categories: ${categoryNames}`);
      }
    }
    
    if (tables.includes('comments')) {
      const commentsCount = await rethinkdb.db(config.db).table('comments').count().run(conn);
      console.log(`Comments: ${commentsCount}`);
      
      if (commentsCount > 0) {
        const comments = await rethinkdb.db(config.db).table('comments').limit(3).run(conn);
        const commentsList = await comments.toArray();
        
        console.log('Sample comments:');
        commentsList.forEach(comment => {
          console.log(`- Item ${comment.itemId}: "${comment.comment.substring(0, 50)}..."`);
        });
      }
    }
    
    if (tables.includes('discoveries')) {
      const discoveriesCount = await rethinkdb.db(config.db).table('discoveries').count().run(conn);
      console.log(`Discoveries: ${discoveriesCount}`);
      
      if (discoveriesCount > 0) {
        const discoveries = await rethinkdb.db(config.db).table('discoveries').limit(5).run(conn);
        const discoveryList = await discoveries.toArray();
        const discoveryIds = discoveryList.map(d => d.itemId).join(', ');
        console.log(`Sample discoveries: ${discoveryIds}`);
      }
    }
    
    console.log('\nRethinkDB data check complete!');
    await closeConnection();
    
  } catch (error) {
    console.error('Error checking RethinkDB data:', error);
    await closeConnection();
  }
}

// Run the check
checkDatabaseTables().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 