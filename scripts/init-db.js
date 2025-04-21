#!/usr/bin/env node

import { getConnection, closeConnection } from '../src/lib/server/db.ts';

async function initDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // 1. Establish database connection
    console.log('Connecting to database...');
    const conn = await getConnection();
    console.log('Connected to RethinkDB successfully');
    
    // 2. Initialize database structure (already done in getConnection)
    console.log('Database structure initialized successfully');
    
    // 3. Close connection
    await closeConnection();
    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

// Run the script
initDatabase(); 