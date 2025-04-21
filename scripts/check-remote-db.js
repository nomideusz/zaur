#!/usr/bin/env node

import rethinkdb from 'rethinkdb';

// Remote database configuration
const remoteConfig = {
  host: 'rethink.zaur.app',
  port: 28015,
  db: 'zaur_news'
};

async function checkRemoteDatabase() {
  console.log(`Checking remote database at ${remoteConfig.host}:${remoteConfig.port}...`);
  let conn;
  
  try {
    // Connect to remote database
    console.log(`Connecting to ${remoteConfig.host}...`);
    conn = await rethinkdb.connect(remoteConfig);
    console.log('Connected to remote database successfully');
    
    // List tables
    const tables = await rethinkdb.tableList().run(conn);
    console.log(`Tables in remote database: ${tables.join(', ')}`);
    
    // Check news table count
    if (tables.includes('news')) {
      const count = await rethinkdb.table('news').count().run(conn);
      console.log(`News table contains ${count} items in remote database`);
      
      if (count > 0) {
        // Get a sample of records
        const sample = await rethinkdb.table('news').limit(3).run(conn);
        const items = await sample.toArray();
        console.log('Sample news items from remote database:');
        console.log(JSON.stringify(items, null, 2));
      }
    } else {
      console.log('News table does not exist in remote database');
    }
    
    // Close connection
    await conn.close();
    console.log('Remote database connection closed');
  } catch (error) {
    console.error('Error checking remote database:', error);
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }
  }
}

// Run the check
checkRemoteDatabase(); 