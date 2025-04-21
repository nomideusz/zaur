#!/usr/bin/env node

import rethinkdb from 'rethinkdb';

// Remote database configuration
const remoteConfig = {
  host: 'rethink.zaur.app',
  port: 28015,
  db: 'zaur_news'
};

// Test data
const testItem = {
  id: `test-item-${Date.now()}`,
  title: 'Test News Item',
  summary: 'This is a test news item to verify database connection.',
  url: 'https://example.com/test',
  publishDate: new Date().toISOString(),
  source: 'Test Source',
  sourceId: 'test',
  category: 'test',
  imageUrl: null,
  author: 'DB Tester'
};

async function testRemoteDatabase() {
  console.log(`Testing remote database at ${remoteConfig.host}:${remoteConfig.port}...`);
  let conn;
  
  try {
    // 1. Connect to remote database
    console.log(`Connecting to ${remoteConfig.host}...`);
    conn = await rethinkdb.connect(remoteConfig);
    console.log('✅ Connected to remote database successfully');
    
    // 2. List databases to verify correct database exists
    const dbs = await rethinkdb.dbList().run(conn);
    console.log(`Databases on server: ${dbs.join(', ')}`);
    
    if (!dbs.includes(remoteConfig.db)) {
      console.log(`⚠️ Database '${remoteConfig.db}' does not exist, creating it...`);
      await rethinkdb.dbCreate(remoteConfig.db).run(conn);
      console.log(`✅ Created database '${remoteConfig.db}'`);
    }
    
    // 3. Use the database
    conn.use(remoteConfig.db);
    
    // 4. List tables
    const tables = await rethinkdb.tableList().run(conn);
    console.log(`Tables in database: ${tables.join(', ') || 'none'}`);
    
    // 5. Test news table existence and create if needed
    if (!tables.includes('news')) {
      console.log('Creating news table...');
      await rethinkdb.tableCreate('news').run(conn);
      console.log('✅ Created news table');
      
      // Create indexes
      console.log('Creating indexes...');
      await rethinkdb.table('news').indexCreate('category').run(conn);
      await rethinkdb.table('news').indexCreate('sourceId').run(conn);
      await rethinkdb.table('news').indexCreate('publishDate').run(conn);
      await rethinkdb.table('news').indexWait().run(conn);
      console.log('✅ Created indexes');
    }
    
    // 6. Insert test item
    console.log('Inserting test item...');
    const result = await rethinkdb.table('news').insert(testItem, {conflict: 'replace'}).run(conn);
    console.log('✅ Insert result:', result);
    
    // 7. Retrieve the item to verify
    console.log('Retrieving test item...');
    const item = await rethinkdb.table('news').get(testItem.id).run(conn);
    console.log('✅ Retrieved item:', item);
    
    // 8. Count all items in the news table
    const count = await rethinkdb.table('news').count().run(conn);
    console.log(`Total items in news table: ${count}`);
    
    if (count > 1) {
      // 9. Show a few items if there are more than our test item
      console.log('Retrieving sample items...');
      const cursor = await rethinkdb.table('news').limit(3).run(conn);
      const items = await cursor.toArray();
      console.log(`Sample items (${items.length}):`);
      items.forEach(item => {
        console.log(`- ${item.id}: ${item.title}`);
      });
    }
    
    // 10. Close connection
    await conn.close();
    console.log('Remote database connection closed');
    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error testing remote database:', error);
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }
  }
}

// Run the test
testRemoteDatabase(); 