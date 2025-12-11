# Setup Guide — AI Data Assistant

Complete setup instructions for the AI Data Assistant MVP foundation.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and npm installed
- **Supabase account** with a project created
- **AI API key** from Anthropic or OpenAI

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Navigate to project directory
cd ai-data-assistant

# Install dependencies for all packages
npm run install:all
```

This installs dependencies in:
- Root package
- `shared/` package
- `backend/` package

### 2. Build Shared Types Package

The shared types must be compiled before the backend can use them:

```bash
npm run build:shared
```

**Expected output:**
```
> @ai-assistant/shared@1.0.0 build
> tsc

✓ Compiled successfully to dist/
```

**Verify:**
```bash
ls shared/dist/
# Should show: index.js, index.d.ts, types/
```

### 3. Configure Backend Environment

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```env
# Get these from Supabase Dashboard > Settings > API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Choose your AI provider
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: Specify model (defaults to provider's default)
AI_MODEL=claude-3-5-sonnet-20241022

# Optional: Server configuration
PORT=3000
NODE_ENV=development
```

### 4. Test Backend Startup

Run the backend to verify configuration:

```bash
npm run backend:dev
```

**Expected output:**
```
🚀 Configuration loaded:
   Environment: development
   Port: 3000
   Supabase URL: https://xxxxx.supabase.co
   AI Provider: anthropic
   AI Model: claude-3-5-sonnet-20241022

✓ Type imports from @ai-assistant/shared working
  - TableInfo interface available
  - QueryFilter interface available
  - AIProvider type available

✓ Type-safe operations validated
  - Example table: public.users
  - Example filter: email eq
  - AI provider: anthropic

✅ Infrastructure ready — MVP foundation complete

Next steps:
  1. Implement schema introspection service
  2. Build natural language query parser
  3. Create SQL generation engine
  4. Add API routes for frontend integration
```

### 5. Run Frontend (Optional)

The frontend is currently a placeholder. To run it:

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in terminal).

## Troubleshooting

### "Missing SUPABASE_URL" Error

**Problem:** Backend fails to start with environment variable error.

**Solution:**
1. Verify `backend/.env` exists
2. Check that variables are set correctly (no quotes needed)
3. Restart the backend: `npm run backend:dev`

### "Cannot find module '@ai-assistant/shared'"

**Problem:** Backend can't import from shared package.

**Solution:**
1. Build the shared package: `npm run build:shared`
2. Verify `shared/dist/` exists
3. Check `backend/tsconfig.json` has correct path alias

### TypeScript Compilation Errors

**Problem:** TypeScript errors when building.

**Solution:**
1. Ensure all dependencies are installed: `npm run install:all`
2. Check Node.js version: `node --version` (should be 18+)
3. Clean and rebuild:
   ```bash
   cd shared && npm run clean && npm run build
   cd ../backend && npm run clean && npm run build
   ```

### Port Already in Use

**Problem:** Backend fails with "EADDRINUSE" error.

**Solution:**
1. Change port in `backend/.env`: `PORT=3001`
2. Or kill the process using port 3000:
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

## Verification Checklist

After setup, verify:

- [ ] `shared/dist/` folder exists with compiled types
- [ ] Backend starts without errors
- [ ] Configuration is logged on startup
- [ ] No TypeScript compilation errors
- [ ] Environment variables are loaded correctly

## Next Steps

With the foundation in place, you can now:

1. **Explore the types** in `shared/src/types/`
2. **Add database service** to introspect Supabase schemas
3. **Integrate AI provider** for natural language parsing
4. **Build API routes** for frontend communication
5. **Develop React UI** for query interface

## Getting Help

- Check the main [README.md](./README.md) for architecture overview
- Review package-specific READMEs:
  - [shared/README.md](./shared/README.md)
  - [backend/README.md](./backend/README.md)
- Verify environment variables match `.env.example`

## Security Reminders

- ✅ `.env` files are in `.gitignore`
- ✅ Never commit API keys or secrets
- ✅ Use `SUPABASE_SERVICE_ROLE_KEY` only in backend
- ✅ Rotate keys regularly
- ✅ Use different credentials for dev/staging/production
