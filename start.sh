#!/bin/sh

echo "Running database migrations and setup..."

# Run migrations with provided environment variables
node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/migrations/json-to-rethinkdb.ts --host=$RETHINKDB_HOST --port=$RETHINKDB_PORT

node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/migrations/news-to-rethinkdb.ts --host=$RETHINKDB_HOST --port=$RETHINKDB_PORT

node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/create-indexes.ts

echo "Starting the application..."
exec node build/index.js 