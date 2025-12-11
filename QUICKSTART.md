# Quick Start Guide

Get the AI Data Assistant running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Supabase account ([sign up free](https://supabase.com))
- Anthropic API key ([get one here](https://console.anthropic.com))

## 1. Install Dependencies

```bash
npm run install:all
```

This installs dependencies for all packages (root, shared, backend).

## 2. Build Shared Types

```bash
npm run build:shared
```

Compiles the shared TypeScript types to `shared/dist/`.

## 3. Configure Backend

Create `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```env
# From Supabase Dashboard > Settings > API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your Anthropic API key
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## 4. Test Backend

```bash
npm run backend:dev
```

You should see:

```
🚀 Configuration loaded:
   Environment: development
   Port: 3000
   Supabase URL: https://xxxxx.supabase.co
   AI Provider: anthropic
   AI Model: claude-3-5-sonnet-20241022

✓ Type imports from @ai-assistant/shared working
✅ Infrastructure ready — MVP foundation complete
```

## 5. Run Frontend

In a new terminal:

```bash
npm run dev
```

Visit `http://localhost:5173` to see the landing page.

## Troubleshooting

### "Missing SUPABASE_URL" Error

Make sure `backend/.env` exists and has the correct values.

### "Cannot find module '@ai-assistant/shared'"

Run `npm run build:shared` to compile the types.

### Port Already in Use

Change the port in `backend/.env`:
```env
PORT=3001
```

## Next Steps

- Read [README.md](./README.md) for architecture overview
- Check [SETUP.md](./SETUP.md) for detailed setup
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow

## Getting Help

- Check documentation files
- Review [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current state
- Search for similar issues

## What's Working

✅ TypeScript monorepo structure  
✅ Shared types package  
✅ Backend configuration layer  
✅ Environment validation  
✅ Frontend landing page  
✅ Zero compilation errors  

## What's Next

The MVP foundation is complete. Next phases will add:

1. **Phase 2**: Schema introspection, AI query parsing, SQL generation
2. **Phase 3**: Query interface, results display, schema explorer
3. **Phase 4**: Advanced features, query suggestions, export functionality

---

**Ready to build?** Check [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.
