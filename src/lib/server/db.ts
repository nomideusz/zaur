import rethinkdb from 'rethinkdb';

// Connection configuration
export const config = {
  host: process.env.RETHINKDB_HOST || 'localhost',
  port: parseInt(process.env.RETHINKDB_PORT || '28015'),
  db: process.env.RETHINKDB_DB || 'zaur_news'
};

// Database connection singleton
let connection: rethinkdb.Connection | null = null;

/**
 * Get a connection to the RethinkDB database
 */
export async function getConnection(): Promise<rethinkdb.Connection> {
  if (connection) return connection as rethinkdb.Connection;
  
  try {
    // Create a connection
    connection = await rethinkdb.connect(config);
    console.log('Connected to RethinkDB');
    
    // Initialize database if needed
    await initDatabase();
    
    return connection;
  } catch (error) {
    console.error('Failed to connect to RethinkDB:', error);
    throw error;
  }
}

/**
 * Initialize the database and tables if they don't exist
 */
async function initDatabase() {
  if (!connection) return;
  
  try {
    // Create database if it doesn't exist
    const dbList = await rethinkdb.dbList().run(connection);
    if (!dbList.includes(config.db)) {
      console.log(`Creating database: ${config.db}`);
      await rethinkdb.dbCreate(config.db).run(connection);
    }
    
    // Create tables if they don't exist
    const tables = await rethinkdb.db(config.db).tableList().run(connection);
    
    // Discoveries table
    if (!tables.includes('discoveries')) {
      console.log('Creating table: discoveries');
      await rethinkdb.db(config.db).tableCreate('discoveries').run(connection);
      // Create index on itemId
      await rethinkdb.db(config.db).table('discoveries').indexCreate('itemId').run(connection);
      await rethinkdb.db(config.db).table('discoveries').indexWait('itemId').run(connection);
    }
    
    // Comments table
    if (!tables.includes('comments')) {
      console.log('Creating table: comments');
      await rethinkdb.db(config.db).tableCreate('comments').run(connection);
      // Create index on itemId
      await rethinkdb.db(config.db).table('comments').indexCreate('itemId').run(connection);
      await rethinkdb.db(config.db).table('comments').indexWait('itemId').run(connection);
    }
    
    // News items table
    if (!tables.includes('news')) {
      console.log('Creating table: news');
      await rethinkdb.db(config.db).tableCreate('news').run(connection);
      // Create indexes
      await rethinkdb.db(config.db).table('news').indexCreate('id').run(connection);
      await rethinkdb.db(config.db).table('news').indexCreate('category').run(connection);
      await rethinkdb.db(config.db).table('news').indexCreate('sourceId').run(connection);
      await rethinkdb.db(config.db).table('news').indexCreate('publishDate').run(connection);
      await rethinkdb.db(config.db).table('news').indexWait().run(connection);
    }
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Close the database connection
 */
export async function closeConnection() {
  if (connection) {
    await connection.close();
    connection = null;
    console.log('RethinkDB connection closed');
  }
}

/**
 * Get all discovered item IDs
 */
export async function getDiscoveredItems(): Promise<string[]> {
  if (!connection) await getConnection();
  
  try {
    const items = await rethinkdb.db(config.db)
      .table('discoveries')
      .pluck('itemId')
      .run(connection as rethinkdb.Connection);
    
    const result: string[] = [];
    await items.toArray().then(array => {
      array.forEach(item => result.push(item.itemId));
    });
    
    return result;
  } catch (error) {
    console.error('Error getting discovered items:', error);
    return [];
  }
}

/**
 * Add a new discovered item
 */
export async function addDiscoveredItem(itemId: string): Promise<boolean> {
  if (!connection) await getConnection();
  
  try {
    // Check if the item already exists
    const existing = await rethinkdb.db(config.db)
      .table('discoveries')
      .getAll(itemId, { index: 'itemId' })
      .count()
      .run(connection as rethinkdb.Connection);
    
    if (existing > 0) {
      return false; // Item already exists
    }
    
    // Add the new item
    await rethinkdb.db(config.db).table('discoveries').insert({
      itemId,
      timestamp: new Date().toISOString()
    }).run(connection as rethinkdb.Connection);
    
    return true;
  } catch (error) {
    console.error('Error adding discovered item:', error);
    return false;
  }
}

/**
 * Get all comments
 */
export async function getComments(): Promise<any[]> {
  if (!connection) await getConnection();
  
  try {
    const comments = await rethinkdb.db(config.db)
      .table('comments')
      .run(connection as rethinkdb.Connection);
    
    return await comments.toArray();
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
}

/**
 * Get comment for a specific item
 */
export async function getComment(itemId: string): Promise<string | null> {
  if (!connection) await getConnection();
  
  try {
    const result = await rethinkdb.db(config.db)
      .table('comments')
      .getAll(itemId, { index: 'itemId' })
      .limit(1)
      .run(connection as rethinkdb.Connection);
    
    const comments = await result.toArray();
    if (comments.length === 0) return null;
    return comments[0].comment;
  } catch (error) {
    console.error('Error getting comment:', error);
    return null;
  }
}

/**
 * Save a comment for an item
 */
export async function saveComment(itemId: string, comment: string): Promise<boolean> {
  if (!connection) await getConnection();
  
  try {
    // Check if comment already exists
    const existing = await rethinkdb.db(config.db)
      .table('comments')
      .getAll(itemId, { index: 'itemId' })
      .run(connection as rethinkdb.Connection);
    
    const comments = await existing.toArray();
    
    if (comments.length > 0) {
      // Update existing comment
      await rethinkdb.db(config.db)
        .table('comments')
        .get(comments[0].id)
        .update({
          comment,
          timestamp: new Date().toISOString()
        })
        .run(connection as rethinkdb.Connection);
    } else {
      // Insert new comment
      await rethinkdb.db(config.db)
        .table('comments')
        .insert({
          itemId,
          comment,
          timestamp: new Date().toISOString()
        })
        .run(connection as rethinkdb.Connection);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving comment:', error);
    return false;
  }
}

/**
 * Get all news items, optionally filtered by category
 */
export async function getNewsItems(category?: string): Promise<any[]> {
  if (!connection) await getConnection();
  
  try {
    let query: any = rethinkdb.db(config.db).table('news');
    
    // Apply category filter if provided
    if (category && category !== 'featured') {
      query = query.getAll(category, { index: 'category' });
    }
    
    // Sort by publish date (descending)
    query = query.orderBy(rethinkdb.desc('publishDate'));
    
    // Execute query
    const result = await query.run(connection as rethinkdb.Connection);
    return await result.toArray();
  } catch (error) {
    console.error('Error getting news items:', error);
    return [];
  }
}

/**
 * Save a news item to the database
 */
export async function saveNewsItem(item: any): Promise<boolean> {
  if (!connection) await getConnection();
  
  try {
    // Check if item already exists
    const existing = await rethinkdb.db(config.db)
      .table('news')
      .getAll(item.id, { index: 'id' })
      .count()
      .run(connection as rethinkdb.Connection);
    
    if (existing > 0) {
      // Update existing item
      await rethinkdb.db(config.db)
        .table('news')
        .getAll(item.id, { index: 'id' })
        .update(item)
        .run(connection as rethinkdb.Connection);
    } else {
      // Insert new item
      await rethinkdb.db(config.db)
        .table('news')
        .insert(item)
        .run(connection as rethinkdb.Connection);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving news item:', error);
    return false;
  }
}

/**
 * Save multiple news items at once
 */
export async function saveNewsItems(items: any[]): Promise<number> {
  if (!connection) await getConnection();
  if (!items || items.length === 0) return 0;
  
  try {
    // Get existing item IDs
    const itemIds = items.map(item => item.id);
    
    // Use eqJoin for multiple IDs
    const existingIds: string[] = [];
    const cursor = await rethinkdb.db(config.db)
      .table('news')
      .getAll(...itemIds)
      .pluck('id')
      .run(connection as rethinkdb.Connection);
    
    const existingItems = await cursor.toArray();
    existingItems.forEach(item => existingIds.push(item.id));
    
    // Separate items into updates and inserts
    const itemsToUpdate = items.filter(item => existingIds.includes(item.id));
    const itemsToInsert = items.filter(item => !existingIds.includes(item.id));
    
    // Perform batch operations
    if (itemsToUpdate.length > 0) {
      await Promise.all(itemsToUpdate.map(item => 
        rethinkdb.db(config.db)
          .table('news')
          .get(item.id)
          .update(item)
          .run(connection as rethinkdb.Connection)
      ));
    }
    
    if (itemsToInsert.length > 0) {
      await rethinkdb.db(config.db)
        .table('news')
        .insert(itemsToInsert)
        .run(connection as rethinkdb.Connection);
    }
    
    return itemsToInsert.length;
  } catch (error) {
    console.error('Error batch saving news items:', error);
    return 0;
  }
}

/**
 * Delete news items older than the specified date
 */
export async function deleteOldNewsItems(olderThan: Date): Promise<number> {
  if (!connection) await getConnection();
  
  try {
    const result = await rethinkdb.db(config.db)
      .table('news')
      .filter(rethinkdb.row('publishDate').lt(olderThan.toISOString()))
      .delete()
      .run(connection as rethinkdb.Connection);
    
    return result.deleted || 0;
  } catch (error) {
    console.error('Error deleting old news items:', error);
    return 0;
  }
} 