# @ai-assistant/shared

Centralized TypeScript type definitions for the AI Data Assistant.

## Purpose

This package provides a single source of truth for types used across the frontend and backend. By centralizing types, we ensure consistency and avoid duplication.

## Structure

```
src/
├── types/
│   ├── database.types.ts  # Database schema and introspection types
│   ├── query.types.ts     # Query building and filtering types
│   └── ai.types.ts        # AI provider and response types
└── index.ts               # Barrel export
```

## Key Types

### Database Types (`database.types.ts`)

- **`TableInfo`** — Complete table metadata including columns, keys, and indexes
- **`ColumnInfo`** — Column metadata with type, nullability, and constraints
- **`ForeignKeyInfo`** — Foreign key relationship information
- **`IndexInfo`** — Index metadata
- **`DataType`** — Normalized data type enum
- **`TypeMapping`** — PostgreSQL to TypeScript type mappings

### Query Types (`query.types.ts`)

- **`QueryFilter`** — Single filter condition with operator and value
- **`FilterOperator`** — Supported filter operators (eq, gt, like, etc.)
- **`QuerySort`** — Sort specification
- **`QueryPagination`** — Pagination parameters
- **`QueryOptions`** — Complete query configuration
- **`QueryResult<T>`** — Typed query result with data and error
- **`NaturalLanguageQuery`** — User's natural language input
- **`ParsedQuery`** — AI-parsed query with SQL and metadata

### AI Types (`ai.types.ts`)

- **`AIProvider`** — Supported AI providers (openai, anthropic)
- **`AIMessage`** — Chat message with role and content
- **`AICompletionRequest`** — Request to AI provider
- **`AICompletionResponse`** — Response from AI provider
- **`AIError`** — AI provider error information

## Usage

### In Backend

```typescript
import { TableInfo, QueryFilter, AIProvider } from '@ai-assistant/shared';

const table: TableInfo = {
  schema: 'public',
  name: 'users',
  columns: [...],
  primaryKeys: ['id'],
  foreignKeys: [],
  indexes: []
};
```

### In Frontend

```typescript
import type { QueryResult, NaturalLanguageQuery } from '@ai-assistant/shared';

const query: NaturalLanguageQuery = {
  text: 'Show me all users created last week',
  context: {
    tables: ['users']
  }
};
```

## Development

### Build

```bash
npm run build
```

Compiles TypeScript to `dist/` with declaration files (`.d.ts`).

### Clean

```bash
npm run clean
```

Removes the `dist/` folder.

## TypeScript Configuration

- **Strict Mode**: Enabled for maximum type safety
- **Target**: ES2020
- **Module**: ESNext
- **Declaration**: Generates `.d.ts` files for consumers

## Design Principles

1. **Self-Documenting**: Types should be clear without excessive comments
2. **Strict Typing**: No `any` types, use `unknown` when type is truly unknown
3. **Composability**: Small, focused interfaces that can be combined
4. **Consistency**: Follow established naming conventions (e.g., `Info` suffix for metadata types)

## Adding New Types

1. Create or edit files in `src/types/`
2. Export from `src/index.ts`
3. Rebuild: `npm run build`
4. Types are immediately available to backend via path aliases
