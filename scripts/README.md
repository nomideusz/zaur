# Zaur System Management Scripts

This directory contains scripts for managing the Zaur dashboard system:

## Setup Scripts

- `setup.js` - Main setup script that initializes the database and populates it with sample data
- `init-db.js` - Initializes the RethinkDB database structure
- `populate-db.js` - Populates the database with sample news items

## News Management Scripts

- `update-news.js` - Fetches latest news from configured RSS feeds and updates the database
- `schedule-news-updates.js` - Sets up a schedule to automatically update news at regular intervals

## Usage

### Initial Setup

To set up the system for the first time:

```bash
# Run the complete setup
node scripts/setup.js

# Or run individual scripts
node scripts/init-db.js
node scripts/populate-db.js
```

### News Updates

To update news:

```bash
# Run a one-time update
node scripts/update-news.js

# Or schedule automatic updates (runs every 3 hours)
node scripts/schedule-news-updates.js
```

### Making Scripts Executable

You can make these scripts executable on Unix-like systems:

```bash
chmod +x scripts/*.js
```

Then run them directly:

```bash
./scripts/setup.js
``` 