# Contributing Guide

Thank you for your interest in contributing to the AI Data Assistant! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Git
- A code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-data-assistant
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Build shared types**
   ```bash
   npm run build:shared
   ```

4. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your credentials
   ```

5. **Verify setup**
   ```bash
   npm run backend:dev
   ```

## Project Structure

```
ai-data-assistant/
├── shared/              # Shared TypeScript types
│   ├── src/
│   │   ├── types/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── backend/             # Node.js backend service
│   ├── src/
│   │   ├── config/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── src/                 # React frontend
│   ├── components/
│   ├── lib/
│   └── main.tsx
│
└── package.json         # Root package with workspaces
```

## Development Workflow

### Making Changes to Shared Types

1. Edit files in `shared/src/types/`
2. Rebuild: `npm run build:shared`
3. Backend automatically picks up changes

Example:
```typescript
// shared/src/types/database.types.ts
export interface NewType {
  id: string;
  name: string;
}
```

### Making Changes to Backend

1. Edit files in `backend/src/`
2. Changes hot-reload automatically with `npm run backend:dev`
3. Import types from `@ai-assistant/shared`

Example:
```typescript
// backend/src/services/example.service.ts
import type { TableInfo } from '@ai-assistant/shared';

export function processTable(table: TableInfo) {
  // Implementation
}
```

### Making Changes to Frontend

1. Edit files in `src/`
2. Changes hot-reload automatically with `npm run dev`
3. Import types from `@ai-assistant/shared` (future)

## Code Style

### TypeScript

- **Strict mode enabled**: No implicit `any`
- **Use `unknown` over `any`**: When type is truly unknown
- **Explicit return types**: For public functions
- **Interface over type**: For object shapes

Good:
```typescript
export interface User {
  id: string;
  email: string;
}

export function getUser(id: string): User | null {
  // Implementation
}
```

Bad:
```typescript
export type User = {  // Use interface instead
  id: any,            // Use string
  email: any          // Use string
}

export function getUser(id) {  // Missing types
  // Implementation
}
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `database.service.ts`)
- **Types**: `PascalCase` (e.g., `TableInfo`)
- **Functions**: `camelCase` (e.g., `getUserById`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Type files**: `.types.ts` suffix (e.g., `database.types.ts`)
- **Config files**: `.config.ts` suffix (e.g., `env.config.ts`)

### File Organization

- **One export per file**: For major types/classes
- **Barrel exports**: Use `index.ts` for clean imports
- **Group related code**: Keep related files together

Example:
```
services/
├── database/
│   ├── database.service.ts
│   ├── database.types.ts
│   └── index.ts
└── ai/
    ├── ai.service.ts
    ├── ai.types.ts
    └── index.ts
```

## Testing

### Running Tests (Future)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

- **Unit tests**: Test individual functions
- **Integration tests**: Test service interactions
- **E2E tests**: Test complete user flows

Example:
```typescript
// database.service.test.ts
import { describe, it, expect } from 'vitest';
import { introspectTable } from './database.service';

describe('introspectTable', () => {
  it('should return table metadata', async () => {
    const result = await introspectTable('users');
    expect(result.name).toBe('users');
    expect(result.columns).toBeInstanceOf(Array);
  });
});
```

## Commit Guidelines

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```bash
feat(backend): add schema introspection service
fix(shared): correct QueryFilter type definition
docs(readme): update setup instructions
refactor(backend): extract config validation logic
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

Examples:
```bash
feature/schema-introspection
fix/env-validation-error
docs/contributing-guide
refactor/config-module
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Verify your changes**
   ```bash
   npm run build:all
   npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/my-feature
   ```

6. **Create a pull request**
   - Describe your changes
   - Reference related issues
   - Request review

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Commit messages follow convention
- [ ] PR description is clear

## Common Tasks

### Adding a New Type

1. Create or edit file in `shared/src/types/`
2. Export from `shared/src/index.ts`
3. Rebuild: `npm run build:shared`

### Adding a New Backend Service

1. Create `backend/src/services/my-service.service.ts`
2. Import types from `@ai-assistant/shared`
3. Export functions with explicit types
4. Add tests in `my-service.service.test.ts`

### Adding a New Environment Variable

1. Add to `backend/src/config/env.config.ts`
2. Update `backend/.env.example`
3. Document in README.md

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update a specific package
npm update <package-name>

# Update all packages (careful!)
npm update
```

## Troubleshooting

### "Cannot find module '@ai-assistant/shared'"

**Solution**: Build the shared package
```bash
npm run build:shared
```

### "Missing environment variable" error

**Solution**: Check `backend/.env` file
```bash
cp backend/.env.example backend/.env
# Edit with your credentials
```

### TypeScript errors after pulling changes

**Solution**: Reinstall and rebuild
```bash
npm run install:all
npm run build:shared
```

### Port already in use

**Solution**: Change port or kill process
```bash
# Change port in backend/.env
PORT=3001

# Or kill process (macOS/Linux)
lsof -ti:3000 | xargs kill -9
```

## Getting Help

- **Documentation**: Check README.md and ARCHITECTURE.md
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
