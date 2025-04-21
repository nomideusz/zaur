#!/usr/bin/env node

import rethinkdb from 'rethinkdb';
import fs from 'fs/promises';
import path from 'path';

// Path to the news sources file - this exists according to our listing
const NEWS_SOURCES_PATH = path.join(process.cwd(), 'src', 'lib', 'server', 'data', 'news.json');
const SAMPLE_NEWS_PATH = path.join(process.cwd(), 'src', 'lib', 'server', 'data', 'sample-news.json');

// Remote database configuration
const remoteConfig = {
  host: 'rethink.zaur.app',
  port: 28015,
  db: 'zaur_news'
};

// Local database configuration
const localConfig = {
  host: 'localhost',
  port: 28015,
  db: 'zaur_news'
};

async function readLocalData() {
  try {
    console.log('Reading local news data...');
    
    // First try to read news sources
    console.log(`Reading news sources from ${NEWS_SOURCES_PATH}...`);
    const sourcesData = await fs.readFile(NEWS_SOURCES_PATH, 'utf-8');
    const sources = JSON.parse(sourcesData).sources || [];
    console.log(`✅ Read ${sources.length} sources from news.json`);
    
    // Then read sample news data
    console.log(`Reading sample news from ${SAMPLE_NEWS_PATH}...`);
    const sampleData = await fs.readFile(SAMPLE_NEWS_PATH, 'utf-8');
    const parsedSampleData = JSON.parse(sampleData);
    console.log(`✅ Read ${parsedSampleData.items.length} items from sample-news.json`);
    
    // Combine the data
    const combinedData = {
      lastUpdated: new Date().toISOString(),
      items: parsedSampleData.items,
      categories: {
        tech: "Technology",
        programming: "Programming",
        design: "Design",
        business: "Business",
        science: "Science",
        products: "Products"
      },
      sources: sources
    };
    
    console.log(`✅ Combined data with ${combinedData.items.length} news items and ${combinedData.sources.length} sources`);
    return combinedData;
  } catch (error) {
    console.error(`❌ Error reading local data: ${error.message}`);
    throw error;
  }
}

async function migrateToLocalDB(localData) {
  console.log('Migrating file data to local database...');
  let localConn = null;
  
  try {
    // Connect to local database
    console.log(`Connecting to local database at ${localConfig.host}...`);
    localConn = await rethinkdb.connect(localConfig);
    console.log('✅ Connected to local database');
    
    // Ensure database exists
    const dbs = await rethinkdb.dbList().run(localConn);
    if (!dbs.includes(localConfig.db)) {
      console.log(`Creating database '${localConfig.db}' on local server...`);
      await rethinkdb.dbCreate(localConfig.db).run(localConn);
    }
    
    // Use the database
    localConn.use(localConfig.db);
    
    // Ensure tables exist
    const localTables = await rethinkdb.tableList().run(localConn);
    
    // Create news table if it doesn't exist
    if (!localTables.includes('news')) {
      console.log(`Creating table 'news' on local...`);
      await rethinkdb.tableCreate('news').run(localConn);
      
      // Create indexes for news table
      console.log('Creating indexes for news table...');
      await rethinkdb.table('news').indexCreate('category').run(localConn);
      await rethinkdb.table('news').indexCreate('sourceId').run(localConn);
      await rethinkdb.table('news').indexCreate('publishDate').run(localConn);
      await rethinkdb.table('news').indexWait().run(localConn);
    }
    
    // Create sources table if it doesn't exist
    if (!localTables.includes('sources')) {
      console.log(`Creating table 'sources' on local...`);
      await rethinkdb.tableCreate('sources').run(localConn);
      
      // Create indexes for sources table
      console.log('Creating indexes for sources table...');
      await rethinkdb.table('sources').indexCreate('category').run(localConn);
      await rethinkdb.table('sources').indexWait().run(localConn);
    }
    
    // Create categories table if it doesn't exist
    if (!localTables.includes('categories')) {
      console.log(`Creating table 'categories' on local...`);
      await rethinkdb.tableCreate('categories').run(localConn);
    }
    
    // Insert news items into local database
    console.log(`Inserting ${localData.items.length} news items...`);
    const newsResult = await rethinkdb.table('news').insert(localData.items, {conflict: 'replace'}).run(localConn);
    console.log('✅ News items migration result:', newsResult);
    
    // Insert sources into local database
    console.log(`Inserting ${localData.sources.length} sources...`);
    const sourcesResult = await rethinkdb.table('sources').insert(localData.sources, {conflict: 'replace'}).run(localConn);
    console.log('✅ Sources migration result:', sourcesResult);
    
    // Insert categories into local database
    const categories = Object.entries(localData.categories).map(([id, name]) => ({ id, name }));
    console.log(`Inserting ${categories.length} categories...`);
    const categoriesResult = await rethinkdb.table('categories').insert(categories, {conflict: 'replace'}).run(localConn);
    console.log('✅ Categories migration result:', categoriesResult);
    
    // Verify local count
    const localNewsCount = await rethinkdb.table('news').count().run(localConn);
    const localSourcesCount = await rethinkdb.table('sources').count().run(localConn);
    const localCategoriesCount = await rethinkdb.table('categories').count().run(localConn);
    
    console.log(`Local database counts after migration:`);
    console.log(`- News items: ${localNewsCount}`);
    console.log(`- Sources: ${localSourcesCount}`);
    console.log(`- Categories: ${localCategoriesCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error during local migration:', error);
    return false;
  } finally {
    if (localConn) {
      localConn.close();
      console.log('Local database connection closed');
    }
  }
}

async function migrateToRemoteDB() {
  console.log('Starting migration from local database to remote database...');
  let localConn = null;
  let remoteConn = null;
  
  try {
    // 1. Connect to local database
    console.log(`Connecting to local database at ${localConfig.host}...`);
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
        
        // Create indexes 
        if (table === 'news') {
          console.log('Creating indexes for news table...');
          await rethinkdb.table('news').indexCreate('category').run(remoteConn);
          await rethinkdb.table('news').indexCreate('sourceId').run(remoteConn);
          await rethinkdb.table('news').indexCreate('publishDate').run(remoteConn);
          await rethinkdb.table('news').indexWait().run(remoteConn);
        } else if (table === 'sources') {
          console.log('Creating indexes for sources table...');
          await rethinkdb.table('sources').indexCreate('category').run(remoteConn);
          await rethinkdb.table('sources').indexWait().run(remoteConn);
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
      localConn.close();
      console.log('Local database connection closed');
    }
    
    if (remoteConn) {
      remoteConn.close();
      console.log('Remote database connection closed');
    }
  }
}

async function main() {
  try {
    // Step 1: Read local file data
    const localData = await readLocalData();
    
    // Step 2: Migrate file data to local database
    const localMigrationSuccess = await migrateToLocalDB(localData);
    
    if (localMigrationSuccess) {
      // Step 3: Migrate local database to remote database
      await migrateToRemoteDB();
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
main(); 