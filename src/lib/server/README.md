# News System

A simple news storage system for Zaur using SvelteKit server features.

## Overview

This system provides a lightweight solution for displaying news without directly fetching from external RSS feeds on each page load. Instead, news data is managed by SvelteKit server-side code and can be updated through a scheduled process.

## Features

- In-memory data store with SvelteKit server
- Server-side API endpoints for reading news
- Support for categorization
- Scheduled updates via SvelteKit endpoints
- Fallback to sample data when needed

## Architecture

```
Client App <-> SvelteKit Server Routes <-> Server Memory <-- Scheduled Fetch --> External RSS Feeds
```

## Components

### Data Storage

- In-memory storage during server runtime
- Sample data imported directly via SvelteKit's module system
- Can be extended to use databases like SQLite, PostgreSQL, etc.

### Utility Functions

Found in `newsStore.js`:
- `readNewsData()` - Retrieves news data from memory
- `writeNewsData()` - Updates in-memory news data
- `getNews()` - Gets news, optionally filtered by category
- `updateNews()` - Updates news with new items
- `getCategories()` - Gets available categories

### API Endpoints

Implementation would require creating SvelteKit routes:
- `GET /api/news` - Get all news or filtered by category
- `GET /api/news/categories` - Get available categories

### Update Script

The update script (`updateNews.js`) is designed to work within SvelteKit's server environment:
1. Reads the current news data
2. Fetches updates from defined sources
3. Merges the new data with existing data
4. Updates the in-memory store

## Running Updates

To trigger news updates, you can:

1. Create a SvelteKit server route that calls the update function
2. Use SvelteKit's Hooks to periodically check for updates
3. For production, you could set up an external cron job that hits your SvelteKit endpoint:

```bash
*/30 * * * * curl https://your-sveltekit-app.com/api/admin/update-news > /path/to/logs/news-update.log 2>&1
```

## Future Improvements

- Implement actual RSS fetching in the updater
- Add authentication for admin functionality 
- Create an admin UI for managing news sources
- Add image caching and processing
- Implement article relevance scoring
- Switch to a persistent database for production 

# Server-Side News Fetching

This implementation provides automatic news fetching from RSS feeds defined in the `news.json` file.

## Features

- Fetches news from multiple RSS sources
- Prioritizes sources based on their priority value
- Updates automatically every hour
- Runs in the background without affecting user experience
- Falls back to sample data in development mode

## Installation

1. Install the required dependencies:

```bash
npm install xml2js
```

2. Update your `package.json` to include the dependency:

```json
"dependencies": {
  "xml2js": "^0.6.2"
}
```

## Configuration

The news sources are configured in `src/lib/server/data/news.json`. Each source has the following properties:

- `id`: Unique identifier for the source
- `name`: Display name of the source
- `url`: URL to the RSS feed
- `category`: Category identifier (must match one in the categories object)
- `priority`: Priority value (higher = higher priority)

## How It Works

1. The system reads the sources from `news.json`
2. It fetches and parses each RSS feed
3. Converts the RSS items to our internal news format
4. Updates the news database with the new items
5. This process runs every hour automatically

## Development Mode

In development mode, the system uses sample data from `sample-news.json` instead of fetching real RSS feeds. This is controlled by the `dev` flag from SvelteKit's environment.

## Production Mode

In production, the system fetches real RSS feeds according to the configuration in `news.json`.

## Customization

To change the update frequency, modify the interval in `src/hooks.server.js`:

```javascript
// Update every 60 minutes (1 hour)
newsUpdateTimer = setupScheduledNewsUpdates(60);
``` 