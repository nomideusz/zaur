#!/usr/bin/env node

import * as db from '../src/lib/server/db.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // 1. Establish database connection
    console.log('Connecting to database...');
    const conn = await db.getConnection();
    console.log('Connected to RethinkDB successfully');
    
    // 2. Initialize database structure
    console.log('Initializing database structure...');
    await db.initializeDatabase();
    console.log('Database structure initialized successfully');
    
    // 3. Close connection
    await db.closeConnection();
    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

// Run the script
initDatabase(); 