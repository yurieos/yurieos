# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Commands

```bash
bun dev           # Development server (http://localhost:3000)
bun run build     # Production build
bun lint          # ESLint
bun typecheck     # TypeScript check
bun format        # Prettier format
bun format:check  # Check formatting
```

## Architecture

### Tech Stack

- **Next.js 16.1** with App Router and React 19
- **Google GenAI SDK** - Gemini API client
- **Vercel AI SDK 6.0** - Streaming primitives
- **Supabase** - Authentication (optional)
- **Upstash Redis** - Chat history (optional)
- **Tailwind CSS + shadcn/ui** - Styling

### Core Structure

```
app/
├── (legal)/          # Legal pages (Privacy Policy, Terms of Service)
├── api/chat/         # Main chat API (Gemini)
├── api/health/       # Health check endpoint
├── auth/             # Authentication pages
└── search/           # Chat conversation pages

lib/
├── gemini/           # Gemini Agentic Module
│   ├── core.ts       # Client, citations, safety
│   ├── agentic.ts    # Agentic workflow
│   ├── deep-research-agent.ts
│   ├── streaming.ts  # Vercel AI SDK adapter
│   ├── system-instructions.ts
│   ├── types.ts
│   └── index.ts
├── schema/           # Zod validation schemas
│   ├── chat.ts       # Chat message schemas
│   └── model.ts      # Model cookie validation
├── supabase/         # Supabase clients
├── redis/            # Redis config
├── actions/          # Server actions
├── config/           # Model config
├── types/            # Shared types
└── utils/            # Utilities

components/
├── ui/               # shadcn/ui components
├── sidebar/          # Chat history
├── prompt-kit/       # Chain of thought
├── auth-forms.tsx    # All auth forms (login, signup, etc.)
├── error-boundary.tsx # Error boundaries
├── new-chat-button.tsx # Reusable new chat button (⌘O)
├── search-chats-button.tsx # Chat search command palette (⌘K)
└── ...               # Feature components

hooks/
└── index.ts          # All hooks (useIsMobile, useCopyToClipboard, etc.)
```

### Operation Modes

- **Standard**: Gemini 3 Flash + Google Search + Code Execution
- **Deep Research**: Deep Research Agent via Interactions API (5-60 min)

## Environment Variables

```bash
# Required
GEMINI_API_KEY=              # or GOOGLE_API_KEY

# Optional
ENABLE_SAVE_CHAT_HISTORY=true
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Key Patterns

1. **Gemini Module**: All AI via `/lib/gemini/`
2. **Async Generators**: Streaming research flows
3. **Type Safety**: Zod schemas in `/lib/schema/`
4. **Streaming**: Vercel AI SDK `createUIMessageStream`
5. **Error Handling**: `ErrorBoundary` and `ChatErrorBoundary` components
6. **Consolidated Hooks**: All hooks in `hooks/index.ts`
7. **Consolidated Auth Forms**: All auth forms in `components/auth-forms.tsx`

## Pre-PR Checklist

```bash
bun lint          # ✅ No ESLint errors
bun typecheck     # ✅ No TypeScript errors
bun format:check  # ✅ Code formatted
bun run build     # ✅ Builds successfully
```

## Health Check

```bash
curl http://localhost:3000/api/health
```

Returns `200 OK` with service status when Gemini is available:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-08T...",
  "version": "0.1.0",
  "services": {
    "gemini": { "available": true },
    "redis": { "configured": true, "connected": true },
    "supabase": { "configured": true }
  }
}
```

Returns `503` if Gemini is not available.

## Model Configuration

Models in `lib/config/models.ts`:

```typescript
{
  id: 'gemini-3-flash-preview',
  name: 'Gemini 3 Flash',
  thinkingConfig: { thinkingLevel: 'medium', includeThoughts: true }
}
```

Model cookie validation via `lib/schema/model.ts` using Zod.

## Next.js 16.1 Notes

- **Proxy**: `proxy.ts` (not `middleware.ts`)
- **ESLint**: `eslint.config.mjs` (flat config)

## Gemini Constants

From `lib/gemini/core.ts`:

- `GEMINI_3_FLASH` = `'gemini-3-flash-preview'`
- `GEMINI_3_PRO` = `'gemini-3-pro-preview'`
- `DEEP_RESEARCH_MODEL` = `'deep-research-pro-preview-12-2025'`

## Deep Research

- `executeDeepResearch()` - Start new research task
- `askFollowUp()` - Continue with follow-up questions
- `reconnectToResearch()` - Resume interrupted research tasks

## Error Boundaries

- `ErrorBoundary` - Generic error boundary with retry
- `ChatErrorBoundary` - Chat-specific with "Start New Chat" option

## Supabase

- Server client: `lib/supabase/server.ts`
- Browser client: `lib/supabase/client.ts`
