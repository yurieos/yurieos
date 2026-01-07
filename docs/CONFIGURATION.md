# Configuration Guide

This guide covers the complete setup and configuration for Yurie AI.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables Reference](#environment-variables-reference)
- [Required Configuration](#required-configuration)
- [Chat History Storage](#chat-history-storage)
- [Authentication](#authentication)
- [AI Provider Configuration](#ai-provider-configuration)
- [Research Modes](#research-modes)
- [Development Commands](#development-commands)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yurieos/yurieos.git
cd yurieos

# 2. Install dependencies
bun install

# 3. Copy environment template
cp .env.example .env.local

# 4. Add your Gemini API key to .env.local
# GEMINI_API_KEY=your-api-key

# 5. Start development server
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables Reference

| Variable                        | Required | Description                                     |
| ------------------------------- | -------- | ----------------------------------------------- |
| `GEMINI_API_KEY`                | ✅ Yes   | Google Gemini API key (or use `GOOGLE_API_KEY`) |
| `GOOGLE_API_KEY`                | ✅ Yes   | Alternative to `GEMINI_API_KEY`                 |
| `NEXT_PUBLIC_BASE_URL`          | ❌ No    | Public base URL for production                  |
| `BASE_URL`                      | ❌ No    | Server-side base URL                            |
| `ENABLE_SAVE_CHAT_HISTORY`      | ❌ No    | Enable chat history (`true`/`false`)            |
| `UPSTASH_REDIS_REST_URL`        | ❌ No    | Upstash Redis REST URL                          |
| `UPSTASH_REDIS_REST_TOKEN`      | ❌ No    | Upstash Redis REST token                        |
| `NEXT_PUBLIC_SUPABASE_URL`      | ❌ No    | Supabase project URL                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ❌ No    | Supabase anonymous key                          |

---

## Required Configuration

### Google Gemini API

Yurie requires a Google Gemini API key. You can use either environment variable name:

```bash
GEMINI_API_KEY=your-gemini-api-key
# Or alternatively:
GOOGLE_API_KEY=your-google-api-key
```

**Get your API key:**

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy the key and add it to your `.env.local`

---

## Chat History Storage

### Using Upstash Redis

Enable persistent chat history with Upstash Redis:

1. Create a database at [Upstash Console](https://console.upstash.com/redis)
2. Navigate to the **Details** tab
3. Find the "Connect your database" section
4. Copy the REST API credentials from the `.env` section
5. Configure your `.env.local`:

```bash
ENABLE_SAVE_CHAT_HISTORY=true
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Reference:** [Building your own RAG chatbot with Upstash](https://upstash.com/blog/rag-chatbot-upstash#setting-up-upstash-redis)

---

## Authentication

### Supabase Setup

Enable user authentication with Supabase:

1. Create a project at [Supabase](https://supabase.com/)
2. Go to **Authentication** → **Providers**
3. Enable Email auth or configure OAuth providers (Google, GitHub, etc.)
4. Copy your credentials from **Settings** → **API**
5. Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supported Auth Methods

| Method         | Configuration                    |
| -------------- | -------------------------------- |
| Email/Password | Enable in Supabase Auth settings |
| Google OAuth   | Add Google provider credentials  |
| GitHub OAuth   | Add GitHub provider credentials  |

---

## AI Provider Configuration

Models are configured in `lib/config/models.ts`. Yurie uses Google Gemini models exclusively.

### Model Configuration

```typescript
// lib/config/models.ts
const MODELS: Model[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    providerId: 'google',
    enabled: true,
    toolCallType: 'native',
    thinkingConfig: { thinkingLevel: 'minimal', includeThoughts: true }
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'Google',
    providerId: 'google',
    enabled: true,
    toolCallType: 'native',
    thinkingConfig: { thinkingLevel: 'high', includeThoughts: true }
  }
]
```

> **Note:** Model configuration requires a rebuild to take effect. This keeps the configuration secure (not publicly exposed) and simplifies the codebase.

### Configuration Fields

| Field            | Type    | Description                                           |
| ---------------- | ------- | ----------------------------------------------------- |
| `id`             | string  | Model identifier (e.g., `gemini-3-flash-preview`)     |
| `name`           | string  | Display name for the UI                               |
| `provider`       | string  | Provider display name                                 |
| `providerId`     | string  | Provider key (`google`)                               |
| `enabled`        | boolean | Toggle model availability                             |
| `toolCallType`   | string  | `"native"` or `"manual"` for function calling         |
| `toolCallModel`  | string  | Optional, only needed if `toolCallType` is `"manual"` |
| `thinkingConfig` | object  | Gemini 3 thinking configuration                       |

### Thinking Configuration (Gemini 3)

Gemini 3 models support configurable thinking depth:

```json
{
  "thinkingConfig": {
    "thinkingLevel": "medium",
    "includeThoughts": true
  }
}
```

| Level     | Use Case               | Recommended Model        |
| --------- | ---------------------- | ------------------------ |
| `minimal` | Simple, fast responses | Gemini 3 Flash           |
| `low`     | Quick reasoning tasks  | Gemini 3 Flash           |
| `medium`  | Balanced reasoning     | Gemini 3 Flash (default) |
| `high`    | Complex analysis       | Gemini 3 Pro (default)   |

Set `includeThoughts: true` to display thought summaries in the UI.

---

## Research Modes

Yurie supports two research modes:

### Standard Mode

Fast responses using Gemini 3 Flash with Google Search grounding:

```
QUERY → SEARCH (Google Grounding) → SYNTHESIZE
```

- **Speed:** Fast (seconds)
- **Best for:** Quick questions, fact-checking, simple lookups
- **Model:** Gemini 3 Flash

### Deep Research Mode

Comprehensive multi-step research using the Deep Research Agent:

```
QUERY → PLAN → SEARCH → ANALYZE → VERIFY → SYNTHESIZE
```

- **Speed:** Slow (5-60 minutes)
- **Best for:** Complex research, in-depth analysis, comprehensive reports
- **Model:** Deep Research Agent (Gemini 3 Pro)

### Deep Research Features

| Feature                  | Description                            |
| ------------------------ | -------------------------------------- |
| **Background Execution** | Research runs asynchronously           |
| **Streaming Progress**   | Real-time updates during research      |
| **Reconnection Support** | Resume interrupted research            |
| **Follow-up Questions**  | Continue conversation after completion |
| **Thought Summaries**    | Transparent reasoning process          |

---

## Development Commands

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `bun dev`          | Start development server with Turbo mode |
| `bun run build`    | Create production build                  |
| `bun start`        | Start production server                  |
| `bun lint`         | Run ESLint for code quality              |
| `bun typecheck`    | Run TypeScript type checking             |
| `bun format`       | Format code with Prettier                |
| `bun format:check` | Check code formatting                    |

### Pre-Commit Checklist

Before creating a PR, ensure all checks pass:

```bash
bun lint          # ✅ No ESLint errors
bun typecheck     # ✅ No TypeScript errors
bun format:check  # ✅ Code properly formatted
bun run build     # ✅ Builds successfully
```

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com/)
3. Add environment variables in the Vercel dashboard:
   - `GEMINI_API_KEY` (required)
   - `ENABLE_SAVE_CHAT_HISTORY` (optional)
   - `UPSTASH_REDIS_REST_URL` (if using chat history)
   - `UPSTASH_REDIS_REST_TOKEN` (if using chat history)
   - `NEXT_PUBLIC_SUPABASE_URL` (if using auth)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (if using auth)
4. Deploy

### Docker

```dockerfile
FROM oven/bun:1.2.12-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.2.12-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["bun", "server.js"]
```

### Deployment Checklist

- [ ] Set `GEMINI_API_KEY` environment variable
- [ ] Configure `NEXT_PUBLIC_BASE_URL` for production domain
- [ ] Set up Redis if using chat history
- [ ] Configure Supabase if using authentication
- [ ] Verify all environment variables are set
- [ ] Run production build locally first: `bun run build`

---

## Troubleshooting

### Common Issues

#### "GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required"

**Cause:** Missing Gemini API key.

**Solution:** Add your API key to `.env.local`:

```bash
GEMINI_API_KEY=your-api-key
```

#### Chat history not saving

**Cause:** Redis not configured or `ENABLE_SAVE_CHAT_HISTORY` not set.

**Solution:**

1. Set `ENABLE_SAVE_CHAT_HISTORY=true`
2. Configure Upstash Redis credentials
3. Restart the development server

#### Authentication not working

**Cause:** Supabase not configured.

**Solution:**

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Ensure auth providers are enabled in Supabase dashboard
3. Restart the development server

#### Build fails with TypeScript errors

**Solution:**

```bash
bun typecheck  # Check for errors
bun lint       # Fix linting issues
```

#### Deep Research takes too long

**Info:** Deep Research can take 5-60 minutes depending on query complexity.

**Tips:**

- Use Standard Mode for quick questions
- Deep Research is best for complex, multi-faceted queries
- Progress updates are streamed in real-time

---

## Additional Resources

- [README.md](../README.md) — Main project documentation
- [Google AI Studio](https://aistudio.google.com/) — Get your Gemini API key
- [Upstash Console](https://console.upstash.com/) — Redis setup
- [Supabase Dashboard](https://supabase.com/dashboard) — Authentication setup
