import { getConnection, getDiscoveredItems, getComments, closeConnection } from './db.js';
async function checkDatabase() {
    try {
        // Connect to the database
        await getConnection();
        // Check discoveries
        const discoveries = await getDiscoveredItems();
        console.log(`Found ${discoveries.length} discoveries in the database:`);
        console.log(discoveries.slice(0, 10).join(', ') + (discoveries.length > 10 ? '...' : ''));
        // Check comments
        const comments = await getComments();
        console.log(`Found ${comments.length} comments in the database:`);
        if (comments.length > 0) {
            comments.slice(0, 5).forEach(comment => {
                console.log(`- Item: ${comment.itemId}, Comment: ${comment.comment.substring(0, 50)}${comment.comment.length > 50 ? '...' : ''}`);
            });
            if (comments.length > 5) {
                console.log('...');
            }
        }
        // Close the connection
        await closeConnection();
    }
    catch (error) {
        console.error('Error checking database:', error);
    }
}
// Run the check
checkDatabase();
