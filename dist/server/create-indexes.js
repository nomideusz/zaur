import { getConnection, closeConnection } from './db.js';
import rethinkdb from 'rethinkdb';
async function createIndexes() {
    let connection;
    try {
        // Connect to the database
        connection = await getConnection();
        console.log('Connected to RethinkDB');
        // Get list of tables
        const tables = await rethinkdb.db('zaur_news')
            .tableList()
            .run(connection);
        console.log(`Found tables: ${tables.join(', ')}`);
        // Make sure news table exists
        if (!tables.includes('news')) {
            console.log('Creating news table...');
            await rethinkdb.db('zaur_news')
                .tableCreate('news')
                .run(connection);
            console.log('News table created');
        }
        // Get existing indexes
        const indexes = await rethinkdb.db('zaur_news')
            .table('news')
            .indexList()
            .run(connection);
        console.log(`Existing indexes: ${indexes.join(', ')}`);
        // Create indexes if they don't exist
        const requiredIndexes = ['category', 'sourceId', 'publishDate'];
        for (const indexName of requiredIndexes) {
            if (!indexes.includes(indexName)) {
                console.log(`Creating index: ${indexName}...`);
                await rethinkdb.db('zaur_news')
                    .table('news')
                    .indexCreate(indexName)
                    .run(connection);
                console.log(`Index ${indexName} created`);
            }
        }
        // Wait for indexes to be ready
        console.log('Waiting for indexes to be ready...');
        await rethinkdb.db('zaur_news')
            .table('news')
            .indexWait()
            .run(connection);
        console.log('All indexes are ready');
        // Close the connection
        await closeConnection();
    }
    catch (error) {
        console.error('Error creating indexes:', error);
        if (connection) {
            await closeConnection();
        }
    }
}
// Run the function
createIndexes();
