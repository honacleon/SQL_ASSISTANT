# AI Data Assistant — MVP Foundation

A TypeScript monorepo for an AI-powered natural language data assistant. Query databases using plain language, powered by Claude or OpenAI.

## 🚀 Quick Start

**New to the project?** See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide.

## 🏗️ Architecture

This is a **monorepo** with three packages:

```
ai-data-assistant/
├── shared/          # @ai-assistant/shared - Shared TypeScript types
├── backend/         # @ai-assistant/backend - Node.js backend with config layer
└── src/             # React frontend (Vite)
```

### Package Overview

- **`shared/`**: Centralized type definitions for database entities, API contracts, and AI interactions
- **`backend/`**: Backend service with environment validation and type-safe configuration
- **`src/`**: React frontend application (future implementation)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account with project credentials
- Anthropic or OpenAI API key

### Installation

```bash
# Install all dependencies across packages
npm run install:all

# Or manually:
npm install
cd shared && npm install
cd ../backend && npm install
```

### Build Shared Package

The `shared` package must be built before running the backend:

```bash
npm run build:shared
```

This compiles TypeScript to `shared/dist/` with type definitions.

### Configure Environment

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-3-5-sonnet-20241022

PORT=3000
NODE_ENV=development
```

### Run Backend

```bash
# Development mode (with hot reload)
npm run backend:dev

# Production mode
npm run build:backend
npm run backend:start
```

### Run Frontend

```bash
npm run dev
```

## 📦 Package Details

### `@ai-assistant/shared`

**Purpose**: Single source of truth for TypeScript types across frontend and backend.

**Key Types**:
- `TableInfo`, `ColumnInfo` — Database schema introspection
- `QueryFilter`, `QueryOptions` — Query building and filtering
- `AIProvider`, `AIMessage` — AI provider abstractions

**Usage**:
```typescript
import { TableInfo, QueryFilter, AIProvider } from '@ai-assistant/shared';
```

**Build**:
```bash
cd shared
npm run build  # Outputs to dist/ with .d.ts files
```

### `@ai-assistant/backend`

**Purpose**: Backend service with environment validation and configuration layer.

**Key Features**:
- ✅ Fail-fast environment validation
- ✅ Type-safe configuration exports
- ✅ Clear error messages for missing env vars
- ✅ Startup logging with sanitized config

**Configuration**:
- `src/config/env.config.ts` — Environment validation and config export
- `src/index.ts` — Entry point demonstrating type imports

**Run**:
```bash
cd backend
npm run dev    # Development with tsx watch
npm run build  # Compile TypeScript
npm start      # Run compiled code
```

## 🛠️ Development Workflow

### Making Changes to Shared Types

1. Edit types in `shared/src/types/`
2. Rebuild: `npm run build:shared`
3. Backend automatically picks up changes via TypeScript path aliases

### Adding New Environment Variables

1. Add to `backend/src/config/env.config.ts`
2. Update `backend/.env.example`
3. Document in this README

### Type Safety Validation

```bash
# Check TypeScript errors across all packages
npm run build:all
```

## 📝 Scripts Reference

### Root Level
- `npm run dev` — Start Vite dev server (frontend)
- `npm run build:shared` — Build shared types package
- `npm run build:backend` — Build backend service
- `npm run build:all` — Build all packages
- `npm run backend:dev` — Run backend in dev mode
- `npm run backend:start` — Run backend in production mode
- `npm run install:all` — Install dependencies for all packages

### Shared Package
- `npm run build` — Compile TypeScript with strict mode
- `npm run clean` — Remove dist/ folder

### Backend Package
- `npm run dev` — Development mode with hot reload
- `npm run build` — Compile TypeScript
- `npm start` — Run compiled application
- `npm run clean` — Remove dist/ folder

## ✅ Success Criteria

This MVP foundation is complete when:

- ✅ Zero TypeScript compilation errors
- ✅ Zero runtime crashes on missing configuration
- ✅ Clean import paths across packages (`@ai-assistant/shared`)
- ✅ Backend starts successfully with valid environment
- ✅ Clear error messages for configuration issues

## 🎯 Next Steps

With the foundation in place, the next phases will add:

1. **Schema Introspection Service** — Query Supabase for table/column metadata
2. **Natural Language Parser** — Convert user queries to structured intent
3. **SQL Generation Engine** — Transform intent into safe SQL queries
4. **API Routes** — REST endpoints for frontend integration
5. **React UI** — Query interface and results visualization

## 📚 Technical Details

### TypeScript Configuration

- **Strict Mode**: Enabled in `shared/` for maximum type safety
- **Path Aliases**: Backend imports from `@ai-assistant/shared` via `tsconfig.json` paths
- **Module System**: ESNext with bundler resolution

### File Naming Conventions

- `.types.ts` — Pure type definition files
- `.config.ts` — Configuration modules
- `index.ts` — Barrel exports for clean imports

### Error Handling Philosophy

- **Fail Fast**: Missing critical env vars throw on startup
- **Clear Messages**: Errors include actionable guidance
- **Type Safety**: Configuration is fully typed and validated

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** — Get started in 5 minutes
- **[SETUP.md](./SETUP.md)** — Detailed setup instructions
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design and architecture
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Development guidelines
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** — Current status and roadmap
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** — Complete documentation guide

## 🔒 Security Notes

- Never commit `.env` files (already in `.gitignore`)
- Use `SUPABASE_SERVICE_ROLE_KEY` only in backend, never expose to frontend
- Rotate API keys regularly
- Use environment-specific credentials for dev/staging/production

## 📄 License

MIT
