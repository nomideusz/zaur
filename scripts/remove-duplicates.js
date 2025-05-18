import { removeDuplicateNews, closeConnection } from '../src/lib/server/newsStorePostgres.js';

// Set environment variables from command line arguments
if (process.argv.length >= 3) {
  process.env.POSTGRES_PASSWORD = process.argv[2];
}
if (process.argv.length >= 4) {
  process.env.POSTGRES_USER = process.argv[3];
}
if (process.argv.length >= 5) {
  process.env.POSTGRES_DB = process.argv[4];
}
if (process.argv.length >= 6) {
  process.env.POSTGRES_HOST = process.argv[5];
}
if (process.argv.length >= 7) {
  process.env.POSTGRES_PORT = process.argv[6];
}

async function main() {
  try {
    console.log('Starting duplicate removal process...');
    
    // Run the duplicate removal function
    const removed = await removeDuplicateNews();
    
    console.log(`Process complete. Removed ${removed} duplicate news items.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close database connection when done
    await closeConnection();
  }
}

// Display usage
if (process.argv.length < 3) {
  console.log('Usage: node remove-duplicates.js <password> [user] [database] [host] [port]');
  console.log('Example: node remove-duplicates.js mypassword postgres zaur_news localhost 5432');
  process.exit(1);
}

main(); 