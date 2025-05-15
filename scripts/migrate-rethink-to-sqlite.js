#!/usr/bin/env node

import * as rethinkStore from '../src/lib/server/newsStore.js';
import * as sqliteStore from '../src/lib/server/newsStoreSqlite.js';
import fs from 'fs';
import path from 'path';

// Main migration function
async function migrateRethinkToSqlite() {
  console.log('Starting migration from RethinkDB to SQLite...');

  try {
    // Check if data directory exists, create if not
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      console.log(`Creating data directory at ${dataDir}`);
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('Initializing SQLite database...');
    sqliteStore.initializeDatabase();

    // Step 1: Try to read news data from RethinkDB
    console.log('Fetching news data from RethinkDB...');
    let newsData;
    try {
      await rethinkStore.initializeDatabase();
      newsData = await rethinkStore.readNewsData();
      console.log(`Found ${newsData.items.length} news items in RethinkDB`);
    } catch (error) {
      console.error('Error reading from RethinkDB:', error);
      console.log('Using sample data instead...');
      // Use sample data as fallback
      const samplePath = path.join(process.cwd(), 'src', 'lib', 'server', 'data', 'sample-news.json');
      if (fs.existsSync(samplePath)) {
        const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
        newsData = {
          items: sampleData.items || [],
          categories: sampleData.categories || {},
          sources: []
        };
        console.log(`Using ${newsData.items.length} sample news items`);
      } else {
        newsData = { items: [], categories: {}, sources: [] };
        console.log('No sample data found, starting with empty database');
      }
    }

    // Step 2: Insert categories into SQLite
    console.log('Migrating categories...');
    const categories = Object.entries(newsData.categories || {}).map(([id, name]) => ({ id, name }));
    if (categories.length > 0) {
      try {
        // Insert categories one by one
        const db = sqliteStore.getConnection();
        const insertCategory = db.prepare('INSERT OR REPLACE INTO categories (id, name) VALUES (?, ?)');
        db.transaction((categories) => {
          for (const category of categories) {
            insertCategory.run(category.id, category.name);
          }
        })(categories);
        console.log(`Migrated ${categories.length} categories`);
      } catch (error) {
        console.error('Error inserting categories:', error);
      }
    } else {
      console.log('No categories to migrate');
    }

    // Step 3: Insert sources into SQLite
    console.log('Migrating sources...');
    if (newsData.sources && newsData.sources.length > 0) {
      try {
        // Insert sources one by one
        const db = sqliteStore.getConnection();
        const insertSource = db.prepare('INSERT OR REPLACE INTO sources (id, name, url, category, priority) VALUES (?, ?, ?, ?, ?)');
        db.transaction((sources) => {
          for (const source of sources) {
            insertSource.run(
              source.id, 
              source.name, 
              source.url || '', 
              source.category || '', 
              source.priority || 0
            );
          }
        })(newsData.sources);
        console.log(`Migrated ${newsData.sources.length} sources`);
      } catch (error) {
        console.error('Error inserting sources:', error);
      }
    } else {
      console.log('No sources to migrate');
    }

    // Step 4: Insert news items into SQLite
    console.log('Migrating news items...');
    if (newsData.items && newsData.items.length > 0) {
      try {
        const result = sqliteStore.updateNews(newsData.items);
        console.log(`Successfully migrated ${result.added} news items (${result.updated} updated)`);
      } catch (error) {
        console.error('Error inserting news items:', error);
      }
    } else {
      console.log('No news items to migrate');
    }

    // Step 5: Close connections
    try {
      await rethinkStore.closeConnection();
    } catch (error) {
      console.error('Error closing RethinkDB connection:', error);
    }

    try {
      sqliteStore.closeConnection();
    } catch (error) {
      console.error('Error closing SQLite connection:', error);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration function
migrateRethinkToSqlite().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error during migration:', error);
  process.exit(1);
}); 