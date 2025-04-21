import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConnection, saveNewsItems, closeConnection } from '../db.js';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the data file
const dataPath = path.join(__dirname, '../data');
const newsFilePath = path.join(dataPath, 'stored-news.json');

// Override database config with provided values (same as in json-to-rethinkdb.ts)
function getDbConfig() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const hostArg = args.find(arg => arg.startsWith('--host='));
  const portArg = args.find(arg => arg.startsWith('--port='));
  
  return {
    host: hostArg ? hostArg.split('=')[1] : process.env.RETHINKDB_HOST || 'localhost',
    port: portArg ? parseInt(portArg.split('=')[1]) : parseInt(process.env.RETHINKDB_PORT || '28015'),
    db: process.env.RETHINKDB_DB || 'zaur_news'
  };
}

// Apply database config override
const dbConfig = getDbConfig();
console.log(`Using database config: ${JSON.stringify(dbConfig)}`);

// Update the db.js module's config
const db = await import('../db.js');
Object.assign(db.config, dbConfig);

async function readNewsFile(): Promise<any> {
  try {
    const data = await fs.readFile(newsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${newsFilePath}:`, error);
    return null;
  }
}

async function migrateNews(): Promise<void> {
  const newsData = await readNewsFile();
  if (!newsData || !newsData.items || !Array.isArray(newsData.items)) {
    console.log('No news items found or invalid format');
    return;
  }
  
  const newsItems = newsData.items;
  console.log(`Migrating ${newsItems.length} news items...`);
  
  try {
    // Save all news items to the database
    const newItemsCount = await saveNewsItems(newsItems);
    
    console.log(`Successfully migrated ${newsItems.length} news items (${newItemsCount} new)`);
  } catch (error) {
    console.error('Error migrating news items:', error);
  }
}

async function runMigration(): Promise<void> {
  try {
    // Establish database connection
    await getConnection();
    
    // Migrate news items
    await migrateNews();
    
    // Close the connection
    await closeConnection();
    
    console.log('News migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('News migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 