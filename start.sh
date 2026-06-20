#!/bin/sh

# Initialize database on startup
echo "Initializing database..."

# Check if database exists
if [ ! -f "prisma/dev.db" ]; then
  echo "Creating database..."
  touch prisma/dev.db
fi

# Start the Next.js server
echo "Starting BitAgent server..."
exec node server.js
