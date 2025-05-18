#!/bin/sh

# Set default for RUN_MIGRATIONS (if not set, don't run migrations)
RUN_MIGRATIONS=${RUN_MIGRATIONS:-false}

# Function to check PostgreSQL connection
check_postgres() {
  echo "Checking connection to PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT..."
  MAX_RETRY=10
  RETRY_COUNT=0

  while [ $RETRY_COUNT -lt $MAX_RETRY ]; do
    # Try connecting using psql
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -c '\q' > /dev/null 2>&1; then
      echo "PostgreSQL at $POSTGRES_HOST is reachable, proceeding..."
      
      # Check if database exists
      if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -lqt | cut -d \| -f 1 | grep -qw $POSTGRES_DB; then
        echo "Database $POSTGRES_DB does not exist. Creating..."
        PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -c "CREATE DATABASE $POSTGRES_DB;" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
          echo "Database $POSTGRES_DB created successfully!"
        else
          echo "Failed to create database $POSTGRES_DB."
        fi
      else
        echo "Database $POSTGRES_DB already exists."
      fi
      
      return 0
    else
      RETRY_COUNT=$((RETRY_COUNT+1))
      if [ $RETRY_COUNT -eq $MAX_RETRY ]; then
        echo "Could not connect to PostgreSQL at $POSTGRES_HOST after $MAX_RETRY attempts."
        echo "Will start the application anyway. The application will use retry logic to connect to the database."
        return 1
      else
        echo "Cannot reach PostgreSQL at $POSTGRES_HOST. Retry $RETRY_COUNT/$MAX_RETRY. Waiting 5 seconds..."
        sleep 5
      fi
    fi
  done
  
  return 1
}

# Check if we should run migrations
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "RUN_MIGRATIONS is set to true. Running database setup..."

  # Check PostgreSQL database and create if needed
  check_postgres
  
  # Legacy RethinkDB migration support - kept for backward compatibility
  if [ ! -z "$RETHINKDB_HOST" ]; then
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
    echo "Running legacy RethinkDB migrations..."
    node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/migrations/json-to-rethinkdb.ts --host=$RETHINKDB_HOST --port=$RETHINKDB_PORT || echo "Migration failed, but continuing startup..."

    echo "Running legacy news migration..."
    node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/migrations/news-to-rethinkdb.ts --host=$RETHINKDB_HOST --port=$RETHINKDB_PORT || echo "News migration failed, but continuing startup..."
  fi
else
  echo "Skipping database migrations (RUN_MIGRATIONS=$RUN_MIGRATIONS)"
fi

# Always create database indexes - this is idempotent and safe to run every time
echo "Creating database indexes..."
node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/create-indexes.ts || echo "Index creation failed, but continuing startup..."

echo "Starting the application..."
exec node build/index.js 