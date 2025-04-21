import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConnection, addDiscoveredItem, saveComment } from '../db.js';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the data files
const dataPath = path.join(__dirname, '../data');
const discoveriesFilePath = path.join(dataPath, 'discoveries.json');
const commentsFilePath = path.join(dataPath, 'zaur_comments.json');

// Get database connection details from environment variables or command line args
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

// Override database config with provided values
const dbConfig = getDbConfig();
console.log(`Using database config: ${JSON.stringify(dbConfig)}`);

// Update the db.js module's config (this is a bit hacky but works for a migration script)
const db = await import('../db.js');
Object.assign(db.config, dbConfig);

async function readJsonFile(filePath: string): Promise<any> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

async function migrateDiscoveries(): Promise<void> {
  const discoveries = await readJsonFile(discoveriesFilePath);
  if (!discoveries || !Array.isArray(discoveries)) {
    console.log('No discoveries found or invalid format');
    return;
  }
  
  console.log(`Migrating ${discoveries.length} discoveries...`);
  
  for (const itemId of discoveries) {
    try {
      await addDiscoveredItem(itemId);
      console.log(`Migrated discovery: ${itemId}`);
    } catch (error) {
      console.error(`Error migrating discovery ${itemId}:`, error);
    }
  }
  
  console.log('Discoveries migration completed');
}

async function migrateComments(): Promise<void> {
  const comments = await readJsonFile(commentsFilePath);
  if (!comments || !Array.isArray(comments)) {
    console.log('No comments found or invalid format');
    return;
  }
  
  console.log(`Migrating ${comments.length} comments...`);
  
  for (const comment of comments) {
    try {
      await saveComment(comment.itemId, comment.comment);
      console.log(`Migrated comment for: ${comment.itemId}`);
    } catch (error) {
      console.error(`Error migrating comment for ${comment.itemId}:`, error);
    }
  }
  
  console.log('Comments migration completed');
}

async function runMigration(): Promise<void> {
  try {
    // Establish database connection
    await getConnection();
    
    // Migrate discoveries
    await migrateDiscoveries();
    
    // Migrate comments
    await migrateComments();
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 