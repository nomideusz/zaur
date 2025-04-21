import { getConnection, closeConnection } from './db.js';
import rethinkdb from 'rethinkdb';

async function checkNews() {
  let connection;
  try {
    // Connect to the database
    connection = await getConnection();
    
    // Count news items
    const totalCount = await rethinkdb.db('zaur_news')
      .table('news')
      .count()
      .run(connection);
    
    console.log(`Total news items in database: ${totalCount}`);
    
    // Get unique categories
    const categories = await rethinkdb.db('zaur_news')
      .table('news')
      .pluck('category')
      .distinct()
      .run(connection);
    
    const categoryArray = await categories.toArray();
    const uniqueCategories = categoryArray.map(item => item.category);
    
    console.log('Available categories:');
    uniqueCategories.forEach(category => {
      console.log(` - ${category}`);
    });
    
    // Sample of items from each category
    for (const category of uniqueCategories) {
      const items = await rethinkdb.db('zaur_news')
        .table('news')
        .getAll(category, { index: 'category' })
        .limit(2)
        .run(connection);
      
      const categoryItems = await items.toArray();
      console.log(`\nSample items for category '${category}' (${categoryItems.length}):`);
      categoryItems.forEach(item => {
        console.log(` - ${item.id}: ${item.title.substring(0, 40)}...`);
      });
    }
    
    // Close the connection
    await closeConnection();
  } catch (error) {
    console.error('Error checking news data:', error);
    if (connection) {
      await closeConnection();
    }
  }
}

// Run the check
checkNews(); 