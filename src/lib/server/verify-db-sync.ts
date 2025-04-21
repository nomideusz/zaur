import { promises as fs } from 'fs';
import path from 'path';
import { getConnection, closeConnection, getDiscoveredItems, getComments, getNewsItems } from './db.js';

/**
 * Verify that all data has been properly migrated to RethinkDB
 * before we remove the JSON files
 */
async function verifyDataMigration() {
  try {
    // Connect to database
    await getConnection();
    console.log('Connected to RethinkDB');
    
    // Check discoveries
    const discoveries = await getDiscoveredItems();
    console.log(`Found ${discoveries.length} discoveries in RethinkDB`);
    
    // Check comments
    const comments = await getComments();
    console.log(`Found ${comments.length} comments in RethinkDB`);
    
    // Check news items
    const newsItems = await getNewsItems();
    console.log(`Found ${newsItems.length} news items in RethinkDB`);
    
    // Load JSON files for comparison
    const dataDir = path.join(process.cwd(), 'src', 'lib', 'server', 'data');
    
    // Check discoveries JSON
    try {
      const discoveriesPath = path.join(dataDir, 'discoveries.json');
      const discoveriesJson = await fs.readFile(discoveriesPath, 'utf8');
      const discoveriesData = JSON.parse(discoveriesJson);
      console.log(`JSON file contains ${discoveriesData.length} discoveries`);
      
      if (discoveries.length >= discoveriesData.length) {
        console.log('✅ All discoveries have been migrated');
      } else {
        console.log('⚠️ Some discoveries may be missing in the database');
      }
    } catch (error) {
      console.log('⚠️ Could not read discoveries.json file');
    }
    
    // Check comments JSON
    try {
      const commentsPath = path.join(dataDir, 'zaur_comments.json');
      const commentsJson = await fs.readFile(commentsPath, 'utf8');
      const commentsData = JSON.parse(commentsJson);
      console.log(`JSON file contains ${commentsData.length} comments`);
      
      if (comments.length >= commentsData.length) {
        console.log('✅ All comments have been migrated');
      } else {
        console.log('⚠️ Some comments may be missing in the database');
      }
    } catch (error) {
      console.log('⚠️ Could not read zaur_comments.json file');
    }
    
    // Check news JSON
    try {
      const newsPath = path.join(dataDir, 'stored-news.json');
      const newsJson = await fs.readFile(newsPath, 'utf8');
      const newsData = JSON.parse(newsJson);
      console.log(`JSON file contains ${newsData.items.length} news items`);
      
      if (newsItems.length >= newsData.items.length) {
        console.log('✅ All news items have been migrated');
      } else {
        console.log('⚠️ Some news items may be missing in the database');
      }
    } catch (error) {
      console.log('⚠️ Could not read stored-news.json file');
    }
    
    // Close connection
    await closeConnection();
    
    console.log('\nVerification complete. If all checks passed, you can safely remove the JSON files.');
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the verification
verifyDataMigration(); 