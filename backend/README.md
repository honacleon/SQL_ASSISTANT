# @ai-assistant/backend

Backend service for the AI Data Assistant with environment validation and type-safe configuration.

## Purpose

This package provides the Node.js backend that will:
- Introspect database schemas
- Parse natural language queries using AI
- Generate and execute SQL queries
- Serve API endpoints for the frontend

## Current Status

**MVP Foundation (Phase 1)** — Infrastructure only:
- ✅ Environment validation with fail-fast behavior
- ✅ Type-safe configuration layer
- ✅ Imports from `@ai-assistant/shared`
- ✅ Startup logging

## Structure

```
src/
├── config/
│   └── env.config.ts  # Environment validation and config export
└── index.ts           # Entry point
```

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Required: Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required: AI provider
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# OR for OpenAI:
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...

# Optional: Specify model
AI_MODEL=claude-3-5-sonnet-20241022

# Optional: Server config
PORT=3000
NODE_ENV=development
```

### Configuration Module

The `env.config.ts` module:
- Validates required environment variables on startup
- Throws descriptive errors if critical vars are missing
- Exports a type-safe configuration object
- Logs sanitized configuration on startup

Example error message:
```
Missing SUPABASE_URL — check .env file. Required for application startup.
```

## Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

Uses `tsx watch` for hot reload on file changes.

### Build

```bash
npm run build
```

Compiles TypeScript to `dist/`.

### Run in Production Mode

```bash
npm start
```

Runs the compiled JavaScript from `dist/`.

## Type Imports

The backend imports types from `@ai-assistant/shared`:

```typescript
import type { TableInfo, QueryFilter, AIProvider } from '@ai-assistant/shared';
```

TypeScript resolves this via path aliases in `tsconfig.json`:

```json
{
  "paths": {
    "@ai-assistant/shared": ["../shared/src/index.ts"]
  }
}
```

## Startup Flow

1. Load environment variables from `.env`
2. Validate required variables (fail fast if missing)
3. Export type-safe configuration object
4. Log sanitized configuration
5. Demonstrate type imports from shared package
6. Ready for feature implementation

## Next Steps

Future phases will add:

1. **Database Service** — Supabase client initialization and schema introspection
2. **AI Service** — Claude/OpenAI integration for query parsing
3. **Query Builder** — SQL generation from parsed intent
4. **API Routes** — Express/Fastify endpoints for frontend
5. **Error Handling** — Centralized error handling and logging

## Security

- Never commit `.env` files
- Use `SUPABASE_SERVICE_ROLE_KEY` only in backend
- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Rotate API keys regularly

## TypeScript Configuration

- **Strict Mode**: Enabled
- **Target**: ES2020
- **Module**: ESNext
- **Module Resolution**: Bundler
