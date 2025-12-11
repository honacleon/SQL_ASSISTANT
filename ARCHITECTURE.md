# Architecture Documentation

## System Overview

The AI Data Assistant is a TypeScript monorepo designed for natural language database querying. The architecture follows a strict separation of concerns with three main packages:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Query Interface                                │    │
│  │  - Natural language input                       │    │
│  │  - Results visualization                        │    │
│  │  - Schema explorer                              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Node.js)                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Schema     │  │   AI Query   │  │     SQL      │ │
│  │ Introspection│  │    Parser    │  │  Generator   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Configuration & Validation                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                    │
        ▼                                    ▼
┌──────────────┐                    ┌──────────────┐
│   Supabase   │                    │  AI Provider │
│  (Database)  │                    │ Claude/GPT-4 │
└──────────────┘                    └──────────────┘
```

## Package Structure

### 1. Shared Package (`@ai-assistant/shared`)

**Purpose**: Centralized type definitions

**Responsibilities**:
- Define database entity types (`TableInfo`, `ColumnInfo`)
- Define query building types (`QueryFilter`, `QueryOptions`)
- Define AI interaction types (`AIMessage`, `AICompletionRequest`)
- Provide type safety across frontend and backend

**Key Design Decisions**:
- **Strict TypeScript**: All types are strictly typed, no `any`
- **Composability**: Small, focused interfaces that can be combined
- **Self-Documenting**: Types are clear without excessive comments
- **Compiled Output**: Generates `.d.ts` files for consumption

**Type Categories**:

1. **Database Types** (`database.types.ts`)
   - Schema introspection metadata
   - Column type mappings
   - Foreign key relationships
   - Index information

2. **Query Types** (`query.types.ts`)
   - Filter operators and conditions
   - Sort and pagination
   - Natural language query input
   - Parsed query output

3. **AI Types** (`ai.types.ts`)
   - Provider abstraction
   - Message format
   - Completion requests/responses
   - Error handling

### 2. Backend Package (`@ai-assistant/backend`)

**Purpose**: Node.js service for query processing

**Current Implementation** (MVP Phase 1):
- Environment validation with fail-fast behavior
- Type-safe configuration export
- Startup logging
- Type import demonstration

**Future Responsibilities**:
- Schema introspection from Supabase
- Natural language query parsing via AI
- SQL generation and validation
- Query execution and result formatting
- API endpoints for frontend

**Key Design Decisions**:
- **Configuration Layer**: Single source of truth for env vars
- **Fail Fast**: Missing critical config throws on startup
- **Type Safety**: All config is typed and validated
- **Clear Errors**: Actionable error messages for developers

**Module Structure**:
```
backend/src/
├── config/
│   └── env.config.ts      # Environment validation
├── services/              # (Future) Business logic
│   ├── database.service.ts
│   ├── ai.service.ts
│   └── query.service.ts
├── routes/                # (Future) API endpoints
│   └── query.routes.ts
└── index.ts               # Entry point
```

### 3. Frontend Package (React + Vite)

**Purpose**: User interface for natural language queries

**Current Status**: Placeholder implementation

**Future Responsibilities**:
- Natural language query input
- Real-time query suggestions
- Results table with sorting/filtering
- Schema explorer
- Query history
- Error handling and feedback

**Technology Stack**:
- React 18 with TypeScript
- Vite for build tooling
- ShadCN UI components
- Tailwind CSS for styling
- React Router for navigation

## Data Flow

### Query Execution Flow (Future Implementation)

```
1. User Input
   │
   ├─→ "Show me all users created last week"
   │
2. Frontend Validation
   │
   ├─→ Check for empty input
   ├─→ Add context (available tables)
   │
3. API Request
   │
   ├─→ POST /api/query
   ├─→ Body: { text: "...", context: {...} }
   │
4. Backend Processing
   │
   ├─→ Parse natural language (AI)
   ├─→ Generate SQL
   ├─→ Validate SQL safety
   ├─→ Execute against Supabase
   │
5. Response
   │
   ├─→ { data: [...], sql: "...", confidence: 0.95 }
   │
6. Frontend Rendering
   │
   └─→ Display results table
       └─→ Show generated SQL
           └─→ Offer refinement options
```

## Type Safety Strategy

### Shared Types as Contract

The `@ai-assistant/shared` package acts as a contract between frontend and backend:

```typescript
// Shared type definition
export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

// Backend implementation
function applyFilter(filter: QueryFilter): string {
  // Type-safe implementation
}

// Frontend usage
const filter: QueryFilter = {
  column: 'created_at',
  operator: 'gte',
  value: new Date('2024-01-01')
};
```

### Benefits

1. **Compile-Time Safety**: Type errors caught before runtime
2. **Refactoring Confidence**: Changes propagate across packages
3. **IDE Support**: Autocomplete and inline documentation
4. **Self-Documenting**: Types serve as living documentation

## Configuration Management

### Environment Variables

Configuration is validated on backend startup:

```typescript
// Required variables throw if missing
const supabaseUrl = requireEnv('SUPABASE_URL');

// Optional variables have fallbacks
const port = getEnv('PORT', '3000');
```

### Configuration Object

All config is exported as a typed object:

```typescript
interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  ai: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model?: string;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
}
```

## Security Architecture

### Principle of Least Privilege

- **Frontend**: Uses `SUPABASE_ANON_KEY` with Row Level Security
- **Backend**: Uses `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- **AI Keys**: Never exposed to frontend

### SQL Injection Prevention

Future implementation will use:
1. **Parameterized Queries**: All user input as parameters
2. **Query Validation**: Parse and validate before execution
3. **Allowlist Approach**: Only allow safe operations
4. **Supabase RLS**: Database-level security policies

### API Security

Future implementation will include:
1. **Authentication**: JWT-based auth via Supabase
2. **Rate Limiting**: Prevent abuse
3. **Input Validation**: Zod schemas for all inputs
4. **CORS**: Restrict origins in production

## Build and Deployment

### Development Workflow

```bash
# 1. Install dependencies
npm run install:all

# 2. Build shared types
npm run build:shared

# 3. Run backend
npm run backend:dev

# 4. Run frontend (separate terminal)
npm run dev
```

### Production Build

```bash
# Build all packages
npm run build:all

# Outputs:
# - shared/dist/     → Compiled types
# - backend/dist/    → Compiled Node.js
# - dist/            → Compiled React app
```

### Deployment Strategy (Future)

- **Frontend**: Static hosting (Vercel, Netlify)
- **Backend**: Node.js hosting (Railway, Render, Fly.io)
- **Database**: Supabase (managed PostgreSQL)
- **Environment**: Separate configs for dev/staging/prod

## Scalability Considerations

### Current Architecture

The MVP foundation is designed for scalability:

1. **Monorepo**: Easy to split into microservices later
2. **Type Safety**: Reduces bugs as codebase grows
3. **Modular Design**: Clear separation of concerns
4. **Configuration Layer**: Easy to add new services

### Future Optimizations

1. **Caching**: Cache schema introspection results
2. **Query Optimization**: Analyze and optimize generated SQL
3. **Connection Pooling**: Efficient database connections
4. **Horizontal Scaling**: Stateless backend for load balancing

## Testing Strategy (Future)

### Unit Tests

- **Shared**: Type validation and utility functions
- **Backend**: Service layer logic
- **Frontend**: Component behavior

### Integration Tests

- **API Endpoints**: Request/response validation
- **Database**: Schema introspection accuracy
- **AI Integration**: Query parsing quality

### E2E Tests

- **User Flows**: Complete query execution
- **Error Handling**: Graceful failure scenarios

## Monitoring and Observability (Future)

1. **Logging**: Structured logs with context
2. **Metrics**: Query performance, AI token usage
3. **Error Tracking**: Sentry or similar
4. **Analytics**: User behavior and query patterns

## Development Principles

### Code Quality

1. **TypeScript Strict Mode**: Maximum type safety
2. **ESLint**: Consistent code style
3. **Prettier**: Automated formatting
4. **No `any` Types**: Use `unknown` when type is uncertain

### Documentation

1. **README Files**: Package-level documentation
2. **Inline Comments**: Only for non-obvious logic
3. **Type Definitions**: Self-documenting types
4. **Architecture Docs**: This file

### Git Workflow

1. **Feature Branches**: One feature per branch
2. **Conventional Commits**: Semantic commit messages
3. **Pull Requests**: Code review before merge
4. **Semantic Versioning**: Version bumps for releases

## Future Enhancements

### Phase 2: Core Functionality

- [ ] Schema introspection service
- [ ] AI query parser integration
- [ ] SQL generation engine
- [ ] Basic API endpoints

### Phase 3: User Interface

- [ ] Query input component
- [ ] Results table with pagination
- [ ] Schema explorer
- [ ] Query history

### Phase 4: Advanced Features

- [ ] Query suggestions and autocomplete
- [ ] Visual query builder
- [ ] Export results (CSV, JSON)
- [ ] Saved queries and templates

### Phase 5: Enterprise Features

- [ ] Multi-database support
- [ ] Team collaboration
- [ ] Access control and permissions
- [ ] Audit logging
