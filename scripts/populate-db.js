#!/usr/bin/env node

import * as db from '../src/lib/server/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSampleData() {
  try {
    // Path to sample data
    const sampleDataPath = path.resolve(__dirname, '../src/lib/server/data/sample-news.json');
    const data = await fs.readFile(sampleDataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading sample data:', error);
    return { items: [] };
  }
}

async function populateDatabase() {
  console.log('Starting database population...');
  
  try {
    // 1. Establish database connection
    console.log('Connecting to database...');
    const conn = await db.getConnection();
    console.log('Connected to RethinkDB successfully');
    
    // 2. Get sample news data
    const sampleData = await readSampleData();
    if (!sampleData.items || sampleData.items.length === 0) {
      console.error('No sample items found');
      return;
    }
    console.log(`Loaded ${sampleData.items.length} sample news items`);
    
    // 3. Save the data to RethinkDB
    console.log('Saving sample items to database...');
    const savedCount = await db.saveNewsItems(sampleData.items);
    console.log(`Successfully saved ${savedCount} new news items to database`);
    
    // 4. Close connection
    await db.closeConnection();
    console.log('Database population completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during database population:', error);
    process.exit(1);
  }
}

// Run the script
populateDatabase(); 