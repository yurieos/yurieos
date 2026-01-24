# AGENTS.md

Agent instructions for the Yurie project - a simple AI chat assistant with Gemini text streaming.

## Setup Commands

- Install deps: `npm install`
- Start dev server: `npm run dev` (Turbopack)
- Production build: `npm run build && npm run start`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Format: `npm run format`
- Health check: `curl http://localhost:3000/api/health`

### Environment Setup

- **Required**: `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
- **Optional**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (chat history)
- **Optional**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (auth)
- **Node.js**: >= 22

Create `.env.local` from the README template.

## Code Style

Based on `biome.json` and `tsconfig.json`:

- TypeScript strict mode enabled
- Single quotes, semicolons as needed
- 2-space indentation, LF line endings
- No trailing commas
- Import alias: `@/*` maps to `./src/*`
- Use `import type` for type-only imports
- Prefer named exports over default exports
- Organize imports (Biome handles this)

## Naming Conventions

| Type       | Convention       | Example                                    |
| ---------- | ---------------- | ------------------------------------------ |
| Files      | kebab-case       | `chat-messages.tsx`, `get-current-user.ts` |
| Components | PascalCase       | `ChatMessages`, `UserMessage`              |
| Functions  | camelCase        | `getGeminiClient`, `validateChatRequest`   |
| Constants  | UPPER_SNAKE_CASE | `GEMINI_3_FLASH`                           |
| Types      | PascalCase       | `Chat`, `UIMessage`, `SafetyResult`        |

## Project Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth routes (login, sign-up, etc.)
│   ├── (main)/             # Main app routes (chat pages)
│   ├── (legal)/            # Legal pages (privacy, terms)
│   └── api/                # API routes
│       ├── chat/           # Streaming chat endpoint
│       ├── chats/          # Chat history list
│       ├── models/         # Model configuration
│       └── health/         # Health check
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── sidebar/            # Sidebar components
├── lib/
│   ├── gemini/             # Gemini AI integration
│   │   ├── core.ts         # Client, safety
│   │   ├── streaming.ts    # Vercel AI SDK adapter
│   │   ├── errors.ts       # Typed error classes
│   │   ├── retry.ts        # Exponential backoff
│   │   ├── constants.ts    # API constants
│   │   └── types.ts        # Type definitions
│   ├── schema/             # Zod validation schemas
│   ├── actions/            # Server actions (chat)
│   ├── supabase/           # Supabase client utilities
│   └── utils/              # Utility functions
└── hooks/                  # Custom React hooks
```

## Key Patterns

### API Route Pattern

All API routes follow: Validation → Auth → Process → Response

```typescript
import { validateChatRequest } from '@/lib/schema/chat'
import { getCurrentUserId } from '@/lib/get-current-user'

export async function POST(request: Request) {
  const body = await request.json()
  const result = validateChatRequest(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  const userId = await getCurrentUserId()
  // ... process and return
}
```

### Component Directives

- Client components: Add `'use client'` at file top
- Server actions: Add `'use server'` at file top
- Default is Server Component in App Router

### Styling

Use `cn()` utility for conditional Tailwind classes:

```typescript
import { cn } from '@/lib/utils'

<div className={cn('base-class', condition && 'conditional-class')} />
```

### Error Handling

Use typed errors from `lib/gemini/errors.ts`:

- `GeminiError` - Base class
- `GeminiRateLimitError` - Retryable, includes `retryAfterMs`
- `GeminiSafetyError` - Content blocked
- `GeminiValidationError` - Invalid request

Use `parseGeminiError()` to convert unknown errors, `getUserFriendlyMessage()` for user display.

### Validation

Use Zod schemas from `lib/schema/`:

- `validateChatRequest()` - Chat API validation
- Always validate before processing

### Performance

- Use `memo()` for expensive components
- Use `useMemo()` and `useCallback()` for expensive computations/callbacks
- Streaming responses via Vercel AI SDK

## Important Files

| File                            | Purpose                    |
| ------------------------------- | -------------------------- |
| `src/lib/gemini/index.ts`       | Gemini module entry point  |
| `src/lib/gemini/streaming.ts`   | Streaming response adapter |
| `src/lib/gemini/core.ts`        | Client and safety checks   |
| `src/lib/schema/chat.ts`        | Chat request validation    |
| `src/lib/models.ts`             | Model configuration        |
| `src/app/api/chat/route.ts`     | Main chat API endpoint     |
| `src/components/chat.tsx`       | Main chat component        |

## Chat Flow

Simple text generation with streaming:

```
User Input → Gemini API → Stream Response → Display
```

The chat uses Gemini's `generateContentStream` for real-time text streaming.

## Testing Instructions

No test suite is currently configured. Before committing:

1. Run type check: `npm run typecheck`
2. Run lint: `npm run lint`
3. Verify health endpoint works: `curl http://localhost:3000/api/health`
4. Test the chat functionality manually

## Commit Guidelines

- Run `npm run lint && npm run typecheck` before committing
- Keep commits focused and descriptive
- Follow existing patterns in the codebase
- Do not commit `.env.local` or secrets

## Common Gotchas

1. **Next.js 16 Proxy**: Auth session handled via `src/proxy.ts` for middleware
2. **Model selection**: Stored in cookies, parsed via `parseModelFromCookie()`
3. **Redis optional**: Chat history requires Redis configuration
4. **Supabase optional**: App works without auth (anonymous users)
5. **Streaming**: Uses Vercel AI SDK format
