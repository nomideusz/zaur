#!/usr/bin/env node

import { getConnection, closeConnection } from '../src/lib/server/db.ts';
import rethinkdb from 'rethinkdb';

async function checkDatabase() {
  console.log('Checking database contents...');
  let conn;
  
  try {
    // Connect to database
    console.log('Connecting to database...');
    conn = await getConnection();
    console.log('Connected to database successfully');
    
    // Get database info - we'll get the DB name from the connection
    // The config might not be directly accessible as expected
    const dbName = conn.db || 'zaur_news';
    console.log(`Using database: ${dbName}`);
    
    // List tables
    const tables = await rethinkdb.tableList().run(conn);
    console.log(`Tables in database: ${tables.join(', ')}`);
    
    // Check news table count
    if (tables.includes('news')) {
      const count = await rethinkdb.table('news').count().run(conn);
      console.log(`News table contains ${count} items`);
      
      if (count > 0) {
        // Get a sample of records
        const sample = await rethinkdb.table('news').limit(3).run(conn);
        const items = await sample.toArray();
        console.log('Sample news items:');
        console.log(JSON.stringify(items, null, 2));
      }
    } else {
      console.log('News table does not exist');
    }
    
    // Close connection
    await closeConnection();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error checking database:', error);
    if (conn) {
      try {
        await closeConnection();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }
  }
}

// Run the check
checkDatabase(); 