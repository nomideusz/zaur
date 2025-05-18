import pg from 'pg';

const password = process.argv[2] || 'postgres';
const username = process.argv[3] || 'postgres';
const database = process.argv[4] || 'zaur_news';
const host = process.argv[5] || 'localhost';
const port = process.argv[6] || 5432;

// Display usage
if (process.argv.length < 3) {
  console.log('Usage: node direct-remove-duplicates.js <password> [user] [database] [host] [port]');
  console.log('Example: node direct-remove-duplicates.js mypassword postgres zaur_news localhost 5432');
  process.exit(1);
}

async function removeDuplicates() {
  // Create a connection directly
  const client = new pg.Client({
    user: username,
    host: host,
    database: database,
    password: password,
    port: port,
  });

  try {
    console.log(`Connecting to PostgreSQL ${username}@${host}:${port}/${database}...`);
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Begin transaction
    await client.query('BEGIN');

    // Find all URLs with multiple entries
    console.log('Finding duplicate news entries...');
    const duplicatesQuery = `
      SELECT url, COUNT(*) as count, array_agg(id) as ids
      FROM news
      GROUP BY url
      HAVING COUNT(*) > 1
    `;
    
    const duplicatesResult = await client.query(duplicatesQuery);
    
    if (duplicatesResult.rows.length === 0) {
      console.log('No duplicate news items found');
      await client.query('COMMIT');
      return 0;
    }
    
    console.log(`Found ${duplicatesResult.rows.length} URLs with duplicate entries`);
    
    let removedCount = 0;
    
    for (const row of duplicatesResult.rows) {
      const { url, count, ids } = row;
      
      // For each URL with duplicates, find the most recent entry
      const mostRecentQuery = `
        SELECT id
        FROM news
        WHERE url = $1
        ORDER BY publish_date DESC
        LIMIT 1
      `;
      
      const mostRecentResult = await client.query(mostRecentQuery, [url]);
      const keepId = mostRecentResult.rows[0].id;
      
      // Delete all other entries
      const idsToDelete = ids.filter(id => id !== keepId);
      
      if (idsToDelete.length > 0) {
        const deleteQuery = `
          DELETE FROM news
          WHERE id = ANY($1::text[])
        `;
        
        const deleteResult = await client.query(deleteQuery, [idsToDelete]);
        removedCount += deleteResult.rowCount;
        
        console.log(`Kept ID ${keepId} and removed ${deleteResult.rowCount} duplicates for URL: ${url}`);
      }
    }
    
    await client.query('COMMIT');
    console.log(`Removed ${removedCount} duplicate news items`);
    
    return removedCount;
  } catch (error) {
    console.error('Error:', error);
    await client.query('ROLLBACK').catch(console.error);
    return 0;
  } finally {
    await client.end().catch(console.error);
    console.log('Database connection closed');
  }
}

removeDuplicates(); 