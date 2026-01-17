# AGENTS.md

Instructions for AI coding agents (Codex, Cursor, Claude, etc.) working with this repository.

## Project Overview

**Yurie** is an open-source Agentic AI with generative UI, built on Google's Gemini API.

### Tech Stack

- **Next.js 16.1** with App Router and React 19
- **Google GenAI SDK** (`@google/genai`) - Gemini API client
- **Vercel AI SDK 6.0** (`ai`) - Streaming primitives
- **Supabase** - Authentication + Storage (optional)
- **Upstash Redis** - Chat history persistence (optional)
- **Tailwind CSS + shadcn/ui** - Styling
- **Zod 4** - Schema validation

### Key Features

- Agentic chat with Gemini 3 Flash/Pro + Google Search + Code Execution
- AI image generation (Gemini Image Pro/Flash)
- AI video generation (Veo 3.1)
- Multimodal support (images, videos, documents, audio)

---

## Development Environment

### Package Manager

- **Primary**: Bun 1.2.12 (specified in `engines` field)
- **Fallback**: npm (for Codex Web sandbox environment)

```bash
# Bun (preferred)
bun install

# npm fallback (Codex Web)
npm install --legacy-peer-deps
```

### Node.js Version

Node.js v22 or later recommended (for React 19 compatibility).

### Environment Variables

**Required:**

```bash
GEMINI_API_KEY=              # Google Gemini API key (or GOOGLE_API_KEY)
```

**Optional:**

```bash
ENABLE_SAVE_CHAT_HISTORY=true
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Commands

Always use these commands for development and verification:

```bash
bun dev           # Development server at http://localhost:3000
bun run build     # Production build
bun lint          # ESLint check
bun typecheck     # TypeScript type check
bun format        # Format code with Prettier
bun format:check  # Check formatting without changes
```

### Pre-Commit Checklist

Run these before committing changes:

```bash
bun lint          # Must pass - no ESLint errors
bun typecheck     # Must pass - no TypeScript errors
bun format:check  # Must pass - code properly formatted
bun run build     # Must pass - builds successfully
```

### Health Check

Verify the app is running correctly:

```bash
curl http://localhost:3000/api/health
```

Expected response (200 OK):

```json
{
  "status": "healthy",
  "services": {
    "gemini": { "available": true }
  }
}
```

---

## Code Style and Conventions

### Formatting (Prettier)

From `prettier.config.js`:

- No semicolons
- Single quotes
- 2-space indentation
- No trailing commas
- LF line endings
- No parentheses around single arrow function parameters

### Import Ordering

Imports are sorted by ESLint `simple-import-sort` in this order:

1. React and Next.js (`react`, `next`)
2. Third-party packages (`@?\\w`)
3. Internal types (`@/types`)
4. Internal config (`@/config`)
5. Internal lib (`@/lib`)
6. Hooks (`@/hooks`)
7. UI components (`@/components/ui`)
8. Other components (`@/components`)
9. Relative imports
10. Style imports

### Path Aliases

Always use the `@/` prefix for imports:

```typescript
// Good
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// Bad
import { cn } from '../../../lib/utils'
```

### File Naming

- Components: PascalCase (`ChatPanel.tsx`) or kebab-case (`chat-panel.tsx`)
- Utilities: kebab-case (`format-time.ts`)
- Route files: `page.tsx`, `route.ts`, `layout.tsx`

### Component Patterns

**Server Components** (default):

- Place in `app/` directory
- No `'use client'` directive
- Can use async/await directly

**Client Components**:

- Add `'use client'` at top of file
- Required for hooks, event handlers, browser APIs
- Prefer keeping client components small and leaf-level

---

## Architecture

### Directory Structure

```
app/
├── (main)/           # Main app routes with sidebar layout
│   ├── imagine/      # AI image generation page
│   ├── search/       # Chat conversation pages
│   │   └── [id]/     # Individual chat by ID
│   └── stuff/        # User's saved images/videos gallery
├── (auth)/           # Authentication routes
│   └── auth/         # Login, signup, password reset
├── (legal)/          # Legal pages (privacy, terms)
└── api/              # API route handlers
    ├── chat/         # Main chat streaming API
    ├── imagine/      # Image generation API
    ├── video/        # Video generation API
    ├── attachments/  # File upload API (Gemini Files API)
    ├── stuff/images/ # Saved images CRUD API
    ├── chats/        # Chat list API
    ├── config/models/# Models configuration API
    └── health/       # Health check endpoint

lib/
├── gemini/           # Gemini AI module (core functionality)
│   ├── core.ts       # Client singleton, constants, safety, URL context
│   ├── agentic.ts    # Agentic workflow with tools
│   ├── constants.ts  # Centralized API constants and limits
│   ├── errors.ts     # Typed error classes
│   ├── retry.ts      # Exponential backoff retry logic
│   ├── tokens.ts     # Token estimation utilities
│   ├── files.ts      # Gemini Files API (video uploads)
│   ├── streaming.ts  # Vercel AI SDK adapter
│   ├── image-generation.ts  # Imagen 3 Pro/Flash
│   ├── video-generation.ts  # Veo 3.1 video generation
│   ├── system-instructions.ts
│   ├── function-calling/     # Function calling module
│   │   ├── executor.ts       # Function execution
│   │   ├── registry.ts       # Function registry
│   │   ├── types.ts          # Type definitions
│   │   ├── validation.ts     # Argument validation
│   │   └── functions/        # Built-in functions (calculator, datetime)
│   ├── types.ts
│   └── index.ts
├── schema/           # Zod validation schemas
│   ├── chat.ts       # Chat message schemas
│   ├── model.ts      # Model cookie validation
│   ├── attachment.ts # Attachment schemas
│   ├── image.ts      # Image generation schemas
│   └── video.ts      # Video generation schemas
├── supabase/         # Supabase client setup
├── redis/            # Upstash Redis configuration
├── actions/          # Server actions
├── config/           # App configuration
├── types/            # TypeScript type definitions
└── utils/            # Utility functions

components/
├── ui/               # shadcn/ui base components
├── sidebar/          # Chat history sidebar
├── chat/             # Chat-specific components
└── prompt-kit/       # AI prompt components
```

### Key Modules

**`lib/gemini/`** - All AI functionality:

- `getGeminiClient()` - Singleton client
- `GEMINI_3_FLASH`, `GEMINI_3_PRO` - Chat model constants
- `GEMINI_IMAGE_PRO`, `GEMINI_IMAGE_FLASH` - Image model constants
- `VEO_3_1`, `VEO_3_1_FAST` - Video model constants
- `process()`, `agenticChat()` - Main entry points for chat
- `generateImage()`, `generateImageStream()`, `editImage()`, `refineImage()` - Image generation
- `generateVideo()`, `generateVideoFromImage()`, `generateVideoWithInterpolation()`, `extendVideo()` - Video generation
- `uploadVideoToFileAPI()`, `uploadAndWaitForVideo()` - File API for large uploads
- `withGeminiRetry()`, `withGeminiRetryStream()` - Exponential backoff retry
- `parseGeminiError()`, `getUserFriendlyMessage()`, `isRetryableError()` - Error handling
- `estimateTokenCount()`, `checkTokenLimits()`, `truncateToTokenLimit()` - Token estimation
- `FunctionRegistry`, `executeFunctionCalls()` - Function calling

**`lib/gemini/constants.ts`** - Centralized constants:

- `LIMITS` - API limits (tokens, URLs, images, videos)
- `TIMING` - Polling intervals, retry delays
- `DEFAULTS` - Default configurations
- `SUPPORTED_FORMATS` - MIME types for various inputs
- `THINKING_LEVELS` - Thinking configuration levels (none, minimal, low, medium, high)
- `MODALITIES` - Response modalities (TEXT, IMAGE, AUDIO)
- `FINISH_REASONS` - Response finish reasons
- `FUNCTION_CALLING_MODES` - Function calling modes (AUTO, ANY, NONE, VALIDATED)

**`lib/schema/`** - Zod schemas for validation:

- `chatSchema` - Message validation
- `modelSchema` - Model configuration
- `attachmentSchema` - Attachment validation
- `imageSchema` - Image generation validation
- `videoSchema` - Video generation validation

**`lib/actions/`** - Server actions:

- `saveChat()`, `getChats()` - Chat persistence
- `saveImage()`, `getImages()` - Image storage
- `saveVideo()`, `getVideos()` - Video storage

### Patterns

1. **Async Generators**: Streaming responses use `AsyncGenerator<Chunk>`
2. **Zod Validation**: All external data validated with Zod schemas
3. **Error Boundaries**: `ErrorBoundary` and `ChatErrorBoundary` components
4. **Consolidated Hooks**: All hooks exported from `hooks/index.ts`
5. **Typed Errors**: `GeminiError` hierarchy with `isRetryableError()` checks
6. **Retry Logic**: `withGeminiRetry()` for transient error recovery
7. **Token Management**: Estimate and validate token usage before requests

---

## Adding New Features

### New API Route

Create in `app/api/<feature>/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Validate input with Zod
  // Call lib functions
  // Return response
}
```

### New Component

1. Client components: Add `'use client'` directive
2. Use `@/components/ui/` for base components
3. Use `cn()` from `@/lib/utils` for className merging

### New Gemini Feature

Add to `lib/gemini/` following existing patterns:

- Export from `lib/gemini/index.ts`
- Add types to `lib/gemini/types.ts`
- Use `getGeminiClient()` singleton

---

## PR and Commit Guidelines

### Commit Message Format

Use conventional commits:

```
<type>: <description>

[optional body]
```

Types:

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `chore:` - Maintenance tasks
- `style:` - Formatting changes

Examples:

```
feat: add video generation support
fix: resolve peer dependency conflict for React 19
refactor: consolidate auth forms into single component
```

### PR Requirements

1. All checks must pass (`lint`, `typecheck`, `format:check`, `build`)
2. Include description of changes
3. Reference related issues if applicable
4. Keep PRs focused on single concern

---

## Common Pitfalls

### Next.js 16.1 Specifics

- **Proxy file**: Uses `proxy.ts` (NOT `middleware.ts`)
- **ESLint config**: Uses `eslint.config.mjs` (flat config format)
- **App Router**: All routes in `app/` directory

### React 19 Compatibility

- Some packages may have peer dependency warnings
- `.npmrc` contains `legacy-peer-deps=true` for npm compatibility
- `next-themes` must be v0.4.4+ for React 19 support

### Gemini API

- Model constants in `lib/gemini/constants.ts`
- Always use `getGeminiClient()` singleton
- Handle safety blocks in responses (use `GeminiSafetyError`)
- Use `withGeminiRetry()` for automatic retry with exponential backoff
- Use typed errors from `lib/gemini/errors.ts`:
  - `GeminiError` - Base error class
  - `GeminiSafetyError` - Content blocked by safety filters
  - `GeminiRateLimitError` - Rate limit exceeded (retryable)
  - `GeminiQuotaError` - Quota exceeded
  - `GeminiAuthError` - Invalid/missing API key
  - `GeminiTimeoutError` - Request timeout (retryable)
  - `GeminiNetworkError` - Network issues (retryable)
  - `GeminiRecitationError` - Content too similar to training data
  - `GeminiTokenLimitError` - Content exceeds token limits
  - `GeminiModelError` - Model unavailable
  - `GeminiValidationError` - Invalid request parameters
- Error utilities: `isRetryableError()`, `isRateLimitError()`, `isSafetyError()`, `parseGeminiError()`, `getUserFriendlyMessage()`
- Use `checkTokenLimits()` to validate request size before sending

### Security

- NEVER commit `.env` files
- NEVER expose API keys in client code
- Use `NEXT_PUBLIC_` prefix only for client-safe variables
- Validate all user input with Zod schemas

---

## Codex-Specific Instructions

### Sandbox Environment (Codex Web)

Codex Web runs in a sandboxed container:

- Uses **npm** (not Bun) for package installation
- `.npmrc` with `legacy-peer-deps=true` handles React 19 peer deps
- Internet access may be restricted after setup

### Required Domains for Internet Access

If enabling agent internet access, allowlist these domains:

```
generativelanguage.googleapis.com
content-generativelanguage.googleapis.com
storage.googleapis.com
supabase.co
upstash.io
```

### Verification Steps

After making changes, always run:

```bash
bun typecheck     # Verify types
bun lint          # Verify code style
bun run build     # Verify build succeeds
```

For quick iteration, `typecheck` alone is often sufficient. Run full `build` before final commit.

### File Change Best Practices

1. Read existing code patterns before modifying
2. Maintain consistent import ordering
3. Update related files together (types, schemas, components)
4. Run verification commands after significant changes

---

## Quick Reference

| Task             | Command                          |
| ---------------- | -------------------------------- |
| Start dev server | `bun dev`                        |
| Type check       | `bun typecheck`                  |
| Lint             | `bun lint`                       |
| Format           | `bun format`                     |
| Build            | `bun run build`                  |
| Health check     | `curl localhost:3000/api/health` |

| Path             | Purpose                     |
| ---------------- | --------------------------- |
| `lib/gemini/`    | All AI/Gemini functionality |
| `lib/schema/`    | Zod validation schemas      |
| `components/ui/` | shadcn/ui components        |
| `app/api/chat/`  | Main chat API               |
| `app/(main)/`    | Primary app routes          |
