# Daily Focus List

A keyboard-first daily planning application built by Njenga Kariuki during 2025–2026. It brings a reusable checklist, daily priorities, notes and calendar events into one continuous workspace.

## What it does

- Creates daily notes from an editable template, with nested list items and keyboard shortcuts.
- Supports focus text, autosaving, date navigation and a sidebar of earlier days.
- Reads Google Calendar events through a server-side OAuth integration.
- Stores notes in PostgreSQL through Drizzle when a database is configured, with an in-memory fallback for local exploration.
- Includes a PWA manifest and service worker for installation on a phone or desktop.

The implementation is React and TypeScript on the client, with an Express API, React Query, Tailwind and PostgreSQL storage. The default checklist uses generic examples.

## Local setup

Install Node.js and run `npm ci`, then `npm run dev`. Environment variables are listed in `.env.example`; provide them through your shell or hosting environment. With no database configuration, notes remain in memory and reset when the server restarts.

For persistence, configure your own `DATABASE_URL` and run `npm run db:push` against that database. For calendar events, configure your own Google OAuth client and refresh token with permission to read the intended calendar.

`npm run build` creates the application build; `npm run check` runs TypeScript checking. See [keyboard shortcuts](KEYBOARD_SHORTCUTS.md) for the editing workflow.

## Project scope

This is a personal planning application. The API uses shared storage and a single configured calendar rather than separate user accounts, so run it locally or behind access controls for personal use. The public repository excludes personal notes and account credentials. Historical setup notes describe earlier iterations; this README reflects the current source structure.
