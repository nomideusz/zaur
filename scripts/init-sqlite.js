#!/usr/bin/env node

// Simple script to manually initialize SQLite database and load sample news
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Database path
const dbPath = path.join(projectRoot, 'data', 'zaur_news.db');
const dataDir = path.dirname(dbPath);

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  console.log(`Creating data directory at ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`Initializing SQLite database at ${dbPath}...`);

try {
  // Connect to SQLite
  const db = new Database(dbPath);
  console.log('Successfully connected to SQLite');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      url TEXT,
      publishDate TEXT,
      source TEXT,
      sourceId TEXT,
      category TEXT,
      imageUrl TEXT,
      author TEXT
    )
  `);
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_sourceId ON news(sourceId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_publishDate ON news(publishDate)`);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT,
      category TEXT,
      priority INTEGER DEFAULT 0
    )
  `);
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sources_category ON sources(category)`);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  
  console.log('Database tables created successfully');
  
  // Create default categories
  const defaultCategories = {
    ai: "Artificial Intelligence",
    dev: "Development",
    crypto: "Cryptocurrency", 
    productivity: "Productivity",
    tools: "Tools & Utilities",
    philosophy: "Philosophy"
  };
  
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)');
  
  for (const [id, name] of Object.entries(defaultCategories)) {
    insertCategory.run(id, name);
  }
  
  console.log('Default categories added');
  
  // Load and insert sample news data
  try {
    const samplePath = path.join(projectRoot, 'src', 'lib', 'server', 'data', 'sample-news.json');
    if (fs.existsSync(samplePath)) {
      console.log('Loading sample news data...');
      const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
      
      if (sampleData.items && sampleData.items.length > 0) {
        console.log(`Found ${sampleData.items.length} sample news items`);
        
        // Prepare statement for inserting news
        const insertNews = db.prepare(`
          INSERT OR REPLACE INTO news (
            id, title, summary, url, publishDate, source, sourceId, category, imageUrl, author
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        // Use a transaction for better performance
        const insertNewsItems = db.transaction((items) => {
          let added = 0;
          let updated = 0;
          
          for (const item of items) {
            try {
              // Check if the item already exists
              const existing = db.prepare('SELECT id FROM news WHERE id = ?').get(item.id);
              
              if (existing) {
                updated++;
              } else {
                added++;
              }
              
              // Insert or replace the item
              insertNews.run(
                item.id,
                item.title,
                item.summary || '',
                item.url || '',
                item.publishDate || new Date().toISOString(),
                item.source || '',
                item.sourceId || '',
                item.category || '',
                item.imageUrl || null,
                item.author || ''
              );
            } catch (err) {
              console.error(`Error inserting news item ${item.id}:`, err);
            }
          }
          
          return { added, updated };
        });
        
        // Run the transaction
        const result = insertNewsItems(sampleData.items);
        console.log(`Added ${result.added} new sample items (${result.updated} updated)`);
      }
    } else {
      console.log('Sample news data file not found, skipping');
    }
  } catch (sampleError) {
    console.error('Error loading sample news:', sampleError);
  }
  
  // Close connection
  db.close();
  console.log('Database connection closed');
  
  console.log('SQLite initialization and sample data load complete');
} catch (error) {
  console.error('Error initializing SQLite database:', error);
  process.exit(1);
}  