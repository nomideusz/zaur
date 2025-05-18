#!/bin/sh

# Set default for RUN_MIGRATIONS (if not set, don't run migrations)
RUN_MIGRATIONS=${RUN_MIGRATIONS:-false}

# Check for necessary environment variables
if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "WARNING: POSTGRES_PASSWORD environment variable is not set. PostgreSQL connection may fail."
  echo "Please ensure the POSTGRES_PASSWORD environment variable is set in your deployment environment."
  echo "The application will continue and try to connect using default credentials or fall back to in-memory store."
fi

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
else
  echo "Skipping database migrations (RUN_MIGRATIONS=$RUN_MIGRATIONS)"
fi

# Skip index creation in production as it requires ts-node
echo "Skipping database index creation in production..."

echo "Starting the application..."
exec node build/index.js 