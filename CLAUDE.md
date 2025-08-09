# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4.6 application with TypeScript, Tailwind CSS v4, and SQLite database using Drizzle ORM.

## Development Commands

```bash
# Development server (always runs on port 3001)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Database operations
npm run db:generate    # Generate new migrations from schema changes
npm run db:migrate     # Run pending migrations
npm run db:push        # Push schema changes directly to database
npm run db:studio      # Open Drizzle Studio GUI for database management
```

## Architecture

### Database Layer
- **SQLite** database stored at `app/db/database.db`
- **Drizzle ORM** configuration in `drizzle.config.ts`
- Schema definitions in `app/db/schema.ts` defining:
  - `users` table: id, name, email, timestamps
  - `posts` table: id, title, content, userId (FK), published, timestamps
- Database connection and exports in `app/db/index.ts`
- Migrations stored in `app/db/migrations/`

### API Structure
- App Router API routes in `app/api/`
- Example database endpoint at `/api/test-db` with GET (fetch data) and POST (create user)

### Frontend
- App Router architecture with layouts and pages in `app/`
- Tailwind CSS v4 for styling
- TypeScript for type safety

## Post Change Instructions
- Always start the dev server after completing your changes.
- Always run the nextdb generate, migrate, and nextjs build commands after making any changes.
- Always start the dev server on port 3001. Use the kill command if the port is already in use.