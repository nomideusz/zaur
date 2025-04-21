#!/bin/sh

echo "Running database migrations and setup..."

# Check database connection
echo "Checking connection to RethinkDB at $RETHINKDB_HOST:$RETHINKDB_PORT..."
MAX_RETRY=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRY ]; do
  # Try connecting (this ping approach doesn't do a full connection test but checks if host is reachable)
  if ping -c 1 $RETHINKDB_HOST > /dev/null 2>&1; then
    echo "Host $RETHINKDB_HOST is reachable, proceeding with migrations..."
    break
  else
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -eq $MAX_RETRY ]; then
      echo "Could not connect to $RETHINKDB_HOST after $MAX_RETRY attempts."
      echo "Will start the application anyway. The application will use retry logic to connect to the database."
    else
      echo "Cannot reach $RETHINKDB_HOST. Retry $RETRY_COUNT/$MAX_RETRY. Waiting 5 seconds..."
      sleep 5
    fi
  fi
done

# Run migrations - these will use the retry logic in the db.ts file
echo "Running database migrations..."
node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/migrations/json-to-rethinkdb.ts --host=$RETHINKDB_HOST --port=$RETHINKDB_PORT || echo "Migration failed, but continuing startup..."

echo "Running news migration..."
node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/migrations/news-to-rethinkdb.ts --host=$RETHINKDB_HOST --port=$RETHINKDB_PORT || echo "News migration failed, but continuing startup..."

echo "Creating database indexes..."
node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/create-indexes.ts || echo "Index creation failed, but continuing startup..."

echo "Starting the application..."
exec node build/index.js 