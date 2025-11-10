# Quick Start Guide

## Database Setup Error?

If you're seeing an error like:
```
error: relation "templates" does not exist
```

This means your database tables haven't been created yet. Here's how to fix it:

### Step 1: Ensure DATABASE_URL is set

**On Replit:**
1. Click the "Secrets" tab (lock icon) in the left sidebar
2. Make sure you have a secret with key `DATABASE_URL`
3. The value should be your PostgreSQL connection string

**For local development:**
1. Create a `.env` file in the project root
2. Add: `DATABASE_URL=your_postgresql_connection_string`

### Step 2: Create the database tables

Run this command:
```bash
npm run db:push
```

This will create the required tables:
- `templates`: Stores your list template
- `daily_notes`: Stores your daily notes

### Step 3: Start the application

```bash
npm run dev
```

You should now see:
```
Using DbStorage with database persistence
```

And the app should work correctly!

## Alternative: Use In-Memory Storage

If you don't want to set up a database, you can run without DATABASE_URL:

1. Remove or unset the DATABASE_URL environment variable
2. Restart the app

You'll see:
```
Using MemStorage (in-memory, no persistence)
```

**Note:** With in-memory storage, your data will be lost when the server restarts.
