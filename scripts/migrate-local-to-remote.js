#!/usr/bin/env node

import rethinkdb from 'rethinkdb';

// Database configurations
const localConfig = {
  host: 'localhost',
  port: 28015,
  db: 'zaur_news'
};

const remoteConfig = {
  host: 'rethink.zaur.app',
  port: 28015,
  db: 'zaur_news'
};

async function migrateData() {
  console.log('Starting migration from local to remote database...');
  let localConn = null;
  let remoteConn = null;
  
  try {
    // 1. Connect to local database
    console.log('Connecting to local database...');
    localConn = await rethinkdb.connect(localConfig);
    console.log('✅ Connected to local database');
    
    // 2. Connect to remote database
    console.log(`Connecting to remote database at ${remoteConfig.host}...`);
    try {
      remoteConn = await rethinkdb.connect(remoteConfig);
      console.log('✅ Connected to remote database');
    } catch (remoteError) {
      console.error('❌ Failed to connect to remote database:', remoteError.message);
      console.log('Note: If you are running this locally and cannot connect to the remote,');
      console.log('try running this script in your deployment environment where network connectivity is available.');
      return;
    }
    
    // 3. Ensure remote database exists
    const dbs = await rethinkdb.dbList().run(remoteConn);
    if (!dbs.includes(remoteConfig.db)) {
      console.log(`Creating database '${remoteConfig.db}' on remote server...`);
      await rethinkdb.dbCreate(remoteConfig.db).run(remoteConn);
    }
    
    // 4. Use the databases
    remoteConn.use(remoteConfig.db);
    localConn.use(localConfig.db);
    
    // 5. Ensure tables exist in remote
    const remoteTables = await rethinkdb.tableList().run(remoteConn);
    const localTables = await rethinkdb.tableList().run(localConn);
    
    console.log(`Local tables: ${localTables.join(', ')}`);
    console.log(`Remote tables: ${remoteTables.join(', ') || 'none'}`);
    
    // 6. Create tables if they don't exist
    for (const table of localTables) {
      if (!remoteTables.includes(table)) {
        console.log(`Creating table '${table}' on remote...`);
        await rethinkdb.tableCreate(table).run(remoteConn);
        
        // Create indexes for news table
        if (table === 'news') {
          console.log('Creating indexes for news table...');
          await rethinkdb.table('news').indexCreate('category').run(remoteConn);
          await rethinkdb.table('news').indexCreate('sourceId').run(remoteConn);
          await rethinkdb.table('news').indexCreate('publishDate').run(remoteConn);
          await rethinkdb.table('news').indexWait().run(remoteConn);
        }
      }
    }
    
    // 7. Migrate data
    for (const table of localTables) {
      console.log(`Migrating data for table '${table}'...`);
      
      // Count local items
      const localCount = await rethinkdb.table(table).count().run(localConn);
      console.log(`Local ${table} count: ${localCount}`);
      
      if (localCount === 0) {
        console.log(`No data to migrate for ${table}`);
        continue;
      }
      
      // Retrieve all local data
      const cursor = await rethinkdb.table(table).run(localConn);
      const items = await cursor.toArray();
      
      // Insert into remote (with conflict replace to avoid duplicates)
      const result = await rethinkdb.table(table).insert(items, {conflict: 'replace'}).run(remoteConn);
      console.log(`✅ Migrated ${items.length} items for ${table}:`, result);
      
      // Verify remote count
      const remoteCount = await rethinkdb.table(table).count().run(remoteConn);
      console.log(`Remote ${table} count after migration: ${remoteCount}`);
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    // Close connections
    if (localConn) {
      try {
        await localConn.close();
        console.log('Local database connection closed');
      } catch (e) {
        console.error('Error closing local connection:', e);
      }
    }
    
    if (remoteConn) {
      try {
        await remoteConn.close();
        console.log('Remote database connection closed');
      } catch (e) {
        console.error('Error closing remote connection:', e);
      }
    }
  }
}

// Run migration
migrateData(); 