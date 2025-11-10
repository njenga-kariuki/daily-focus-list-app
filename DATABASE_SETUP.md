# Database Setup

## Overview

The app now supports both in-memory storage (MemStorage) and database persistence (DbStorage).

## Current Behavior

- **Without DATABASE_URL**: Uses MemStorage (in-memory, data lost on restart)
- **With DATABASE_URL**: Uses DbStorage (PostgreSQL, data persists)

## Setting up PostgreSQL persistence

### 1. Set DATABASE_URL environment variable

For Replit:
- Go to the "Secrets" tab (lock icon in left sidebar)
- Add a secret with key `DATABASE_URL`
- Value should be a PostgreSQL connection string, e.g.:
  ```
  postgresql://user:password@host:5432/database
  ```

For local development:
- Create a `.env` file in the project root
- Add: `DATABASE_URL=postgresql://user:password@localhost:5432/database`

### 2. Generate and push database schema

Once DATABASE_URL is set:

```bash
npm run db:push
```

This will create the required tables:
- `templates`: Stores template configurations
- `daily_notes`: Stores daily notes with content

### 3. Restart the server

After setting DATABASE_URL and pushing the schema, restart the app. You should see:
```
Using DbStorage with database persistence
```

If DATABASE_URL is not set, you'll see:
```
Using MemStorage (in-memory, no persistence)
```

## Benefits of Database Persistence

- Template edits persist across server restarts
- Daily notes are permanently saved
- Multiple users can share the same data (with proper auth)
- Data survives deployments and restarts

## Current Template (Fixed)

The default template has been updated to:
1. pre-workout (lowercase, hyphenated)
2. workout (separate item)
3. post-workout (separate item)
4. Schedule
5. Priority To Do
6. Secondary
