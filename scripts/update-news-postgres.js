// Script to update news in the PostgreSQL database using sample data
import { initializeDatabase, updateNews, pruneNewsItems, closeConnection } from '../src/lib/server/newsStorePostgres.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load sample data using fs
const sampleDataPath = path.join(__dirname, '../src/lib/server/data/sample-news.json');
const sampleNewsData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

// Main function to execute script
async function main() {
  try {
    console.log('Initializing PostgreSQL database...');
    await initializeDatabase();
    
    console.log(`Updating database with ${sampleNewsData.items.length} sample news items...`);
    const result = await updateNews(sampleNewsData.items);
    
    console.log(`Sample data update complete. Added: ${result.added}, Updated: ${result.updated}`);
    
    console.log('Pruning old news items...');
    const pruneResult = await pruneNewsItems(100);
    console.log(`Pruned ${pruneResult.removed} old news items`);
    
    // Close database connection when done
    await closeConnection();
    console.log('Database connection closed. Update complete.');
  } catch (error) {
    console.error('Error updating news:', error);
    process.exit(1);
  }
}

// Run the script
main(); 