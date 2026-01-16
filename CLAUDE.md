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
- **Supabase** - Authentication + Storage (optional)
- **Upstash Redis** - Chat history (optional)
- **Tailwind CSS + shadcn/ui** - Styling

### Core Structure

```
app/
├── (main)/           # Main app routes (with sidebar)
│   ├── imagine/      # AI image generation
│   ├── search/       # Chat conversation pages
│   └── stuff/        # User's saved images/videos
├── (auth)/           # Authentication routes
├── (legal)/          # Legal pages (Privacy Policy, Terms of Service)
└── api/
    ├── chat/         # Main chat streaming API
    ├── imagine/      # Image generation API
    ├── video/        # Video generation API
    ├── attachments/  # File upload API (Gemini Files API)
    ├── stuff/images/ # Saved images CRUD
    ├── chats/        # Chat list API
    ├── config/models/# Models configuration API
    └── health/       # Health check endpoint

lib/
├── gemini/           # Gemini AI Module
│   ├── core.ts       # Client singleton, citations, safety, URL context
│   ├── agentic.ts    # Agentic workflow with tools
│   ├── constants.ts  # Centralized API constants and limits
│   ├── errors.ts     # Typed error classes (GeminiError, etc.)
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
├── supabase/         # Supabase clients
├── redis/            # Redis config
├── actions/          # Server actions
├── config/           # Model config
├── types/            # Shared types
└── utils/            # Utilities

components/
├── ui/               # shadcn/ui components
├── sidebar/          # Chat history
├── chat/             # Chat-specific components
├── prompt-kit/       # Chain of thought
├── auth-forms.tsx    # All auth forms (login, signup, etc.)
├── error-boundary.tsx # Error boundaries
├── new-chat-button.tsx # Reusable new chat button (⌘O)
├── search-chats-button.tsx # Chat search command palette (⌘K)
└── ...               # Feature components

hooks/
└── index.ts          # All hooks (useIsMobile, useCopyToClipboard, etc.)
```

### Features

- Gemini 3 Flash/Pro with Google Search + Code Execution
- AI image generation (Gemini Image Pro/Flash)
- AI video generation (Veo 3.1)

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
  thinkingConfig: { thinkingLevel: 'minimal', includeThoughts: false }
}
{
  id: 'gemini-3-pro-preview',
  name: 'Gemini 3 Pro',
  thinkingConfig: { thinkingLevel: 'high', includeThoughts: true }
}
```

Model cookie validation via `lib/schema/model.ts` using Zod.

## Next.js 16.1 Notes

- **Proxy**: `proxy.ts` (not `middleware.ts`)
- **ESLint**: `eslint.config.mjs` (flat config)

## Gemini Constants

From `lib/gemini/constants.ts`:

- `GEMINI_3_FLASH` = `'gemini-3-flash-preview'`
- `GEMINI_3_PRO` = `'gemini-3-pro-preview'`
- `GEMINI_IMAGE_FLASH` = `'gemini-3-flash-image-preview'`
- `GEMINI_IMAGE_PRO` = `'gemini-3-pro-image-preview'`
- `VEO_3_1` = `'veo-3.1-generate-preview'`
- `VEO_3_1_FAST` = `'veo-3.1-fast-generate-preview'`

Also exports `LIMITS`, `TIMING`, `DEFAULTS`, `SUPPORTED_FORMATS`, `THINKING_LEVELS`, `MODALITIES`, `FINISH_REASONS`, `FUNCTION_CALLING_MODES` constants.

## Image Generation

- `generateImage()` - Generate image from text prompt
- `generateImageStream()` - Streaming image generation
- `editImage()` - Edit existing image with prompt
- `refineImage()` - Refine/upscale image

## Video Generation

- `generateVideo()` - Text-to-video generation
- `generateVideoFromImage()` - Image-to-video (first frame)
- `generateVideoWithInterpolation()` - First+last frame interpolation
- `generateVideoWithReferences()` - Video with asset reference images
- `extendVideo()` - Extend existing video
- `downloadVideo()` - Download video from URI
- `validateVideoConfig()` - Validate video generation config

## Error Handling

Typed error classes in `lib/gemini/errors.ts`:

- `GeminiError` - Base error class
- `GeminiSafetyError` - Content blocked by safety filters
- `GeminiRateLimitError` - Rate limit exceeded (retryable)
- `GeminiQuotaError` - Quota exceeded
- `GeminiAuthError` - Invalid/missing API key
- `GeminiTimeoutError` - Request timeout (retryable)
- `GeminiNetworkError` - Network issues (retryable)
- `GeminiRecitationError` - Content too similar to training data
- `GeminiTokenLimitError` - Content exceeds token limits
- `GeminiModelError` - Model unavailable (may be retryable)
- `GeminiValidationError` - Invalid request parameters

Utilities: `isRetryableError()`, `isRateLimitError()`, `isSafetyError()`, `parseGeminiError()`, `getUserFriendlyMessage()`

## Retry Logic

From `lib/gemini/retry.ts`:

- `withGeminiRetry()` - Wrap async functions with exponential backoff
- `withGeminiRetryStream()` - Retry for streaming responses
- Configurable: `maxRetries`, `baseDelayMs`, `maxDelayMs`, `jitterFactor`

## Token Estimation

From `lib/gemini/tokens.ts`:

- `estimateTokenCount()` - Estimate tokens for text
- `estimateMessageTokens()` - Estimate tokens for message with attachments
- `estimateTotalTokens()` - Estimate total tokens for conversation
- `checkTokenLimits()` - Validate against model limits
- `truncateToTokenLimit()` - Truncate conversation history
- `getTokenSummary()` - Get human-readable token summary

## Error Boundaries

- `ErrorBoundary` - Generic error boundary with retry
- `ChatErrorBoundary` - Chat-specific with "Start New Chat" option

## File API (Large Uploads)

From `lib/gemini/files.ts`:

- `uploadVideoToFileAPI()` - Upload video to Gemini File API
- `uploadAndWaitForVideo()` - Upload and wait for processing
- `waitForProcessing()` - Poll for file processing completion
- `getFileStatus()` - Get file processing status
- `deleteFile()` - Delete uploaded file

## Supabase

- Server client: `lib/supabase/server.ts`
- Browser client: `lib/supabase/client.ts`
- Migrations: `supabase/migrations/` (run in Supabase SQL Editor)
