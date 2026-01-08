# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Development

- `bun dev` - Start development server with Next.js Turbo mode (http://localhost:3000)
- `bun run build` - Create production build
- `bun start` - Start production server
- `bun lint` - Run ESLint for code quality checks and import sorting
- `bun typecheck` - Run TypeScript type checking
- `bun format` - Format code with Prettier
- `bun format:check` - Check code formatting without modifying files

## Architecture Overview

### Tech Stack

- **Next.js 16.1** with App Router and React Server Components
- **React 19** with TypeScript for type safety
- **Google GenAI SDK** - Unified Gemini API client
- **Gemini 3 Flash** - Fast responses with Google Search grounding
- **Deep Research Agent** - Comprehensive multi-step research
- **Supabase** for authentication and backend services
- **Redis** (Upstash) for chat history storage
- **Tailwind CSS** with shadcn/ui components

### Core Architecture

1. **App Router Structure** (`/app`)
   - `/api/chat/` - Main chat API using Gemini
   - `/auth/` - Authentication pages (login, signup, password reset)
   - `/search/` - Search functionality and results display

2. **Gemini Research Module** (`/lib/gemini`)
   - `/lib/gemini/client.ts` - Singleton GoogleGenAI client
   - `/lib/gemini/research.ts` - Research workflow (standard + deep modes)
   - `/lib/gemini/deep-research-agent.ts` - Official Deep Research Agent
   - `/lib/gemini/streaming.ts` - Vercel AI SDK integration
   - `/lib/gemini/citations.ts` - Grounding metadata parsing
   - `/lib/gemini/safety.ts` - Input safety validation
   - `/lib/gemini/system-instructions.ts` - Agentic system instruction templates
   - `/lib/gemini/types.ts` - Type definitions
   - `/lib/gemini/index.ts` - Module exports

3. **Research Modes**
   - **Standard Mode**: Gemini 3 Flash with Google Search grounding (fast)
   - **Deep Research Mode**: Deep Research Agent via Interactions API (comprehensive)

4. **Component Organization** (`/components`)
   - `/sidebar/` - Chat history and navigation
   - `/ui/` - Reusable UI components from shadcn/ui
   - `/prompt-kit/` - Chain of thought display components
   - Feature-specific components (auth forms, chat interfaces)

5. **State Management**
   - Server-side state via React Server Components
   - Client-side hooks in `/hooks/`
   - Redis for persistent chat history
   - Supabase for user data

## Environment Configuration

### Required Variables

```bash
# Gemini API (required)
GEMINI_API_KEY=         # Or use GOOGLE_API_KEY
```

### Optional Variables

```bash
# Base URL (for production deployments)
NEXT_PUBLIC_BASE_URL=   # or BASE_URL

# Chat History (Upstash Redis)
ENABLE_SAVE_CHAT_HISTORY=true
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

See `.env.example` for a complete template.

## Research Workflow

### Standard Mode (Gemini 3 Flash + Google Search)

Fast, efficient responses with grounded sources:

```
┌─────────────────────────────────────────────────┐
│  QUERY → SEARCH (Google Grounding) → SYNTHESIZE │
└─────────────────────────────────────────────────┘
```

1. User submits query
2. Gemini 3 Flash searches with Google Search grounding
3. Response streams with sources displayed separately
4. Follow-up questions generated

### Deep Research Mode (Deep Research Agent)

Comprehensive multi-step research with autonomous planning:

```
┌──────────────────────────────────────────────────────────────┐
│  QUERY → PLAN → SEARCH → ANALYZE → VERIFY → SYNTHESIZE      │
└──────────────────────────────────────────────────────────────┘
```

1. Deep Research Agent autonomously plans research steps
2. Multiple web searches with grounding
3. Fact verification and triangulation
4. Comprehensive cited report generated
5. Thought summaries for transparency

## Key Development Patterns

1. **All Research via Gemini**: The main `/api/chat` route uses the Gemini module
2. **Async Generators**: Research flows through async generator functions for streaming
3. **Type Safety**: Strict TypeScript with type definitions in `/lib/gemini/types.ts`
4. **Schema Validation**: Zod schemas in `/lib/schema/` for data validation
5. **Streaming**: Uses Vercel AI SDK's `createUIMessageStream` for real-time updates

## Testing Approach

Currently no dedicated test framework. Verify changes by:

1. Running `bun lint` to check code quality
2. Building with `bun run build` to catch TypeScript errors
3. Manual testing in development mode

## Pre-PR Requirements

Before creating a pull request, you MUST ensure all of the following checks pass:

1. **Linting**: Run `bun lint` and fix all ESLint errors and warnings
2. **Type checking**: Run `bun typecheck` to ensure no TypeScript errors
3. **Formatting**: Run `bun format:check` to verify code formatting
4. **Build**: Run `bun run build` to ensure the application builds successfully

## Model Configuration

Models are defined in `lib/config/models.ts` with:

- `id`: Model identifier (e.g., `gemini-3-flash-preview`)
- `name`: Display name for the UI
- `provider`: Provider display name
- `providerId`: Provider key (`google`)
- `enabled`: Toggle availability
- `toolCallType`: `"native"` or `"manual"` for function calling
- `thinkingConfig`: Gemini 3 thinking configuration
  - `thinkingLevel`: `"minimal"`, `"low"`, `"medium"`, or `"high"`
  - `includeThoughts`: Boolean to show thought summaries

> **Note:** Model changes require a rebuild. This keeps configuration secure and simplifies the codebase.

## Next.js 16.1 Conventions

### Proxy (formerly Middleware)

Next.js 16 renamed `middleware.ts` to `proxy.ts`. The proxy file is located at the project root:

- **File**: `proxy.ts` (not `middleware.ts`)
- **Export**: `export default async function proxy(request: NextRequest)`
- **Purpose**: Request interception for authentication, redirects, etc.

### ESLint Configuration

Uses ESLint 9 flat config format:

- **File**: `eslint.config.mjs` (not `.eslintrc.json`)
- **Config**: Native Next.js flat config with `eslint-config-next`

## File Structure

```
lib/
├── gemini/                    # Gemini Research Module
│   ├── client.ts              # Singleton GoogleGenAI client
│   ├── research.ts            # Research workflow (standard + deep)
│   ├── deep-research-agent.ts # Official Deep Research Agent
│   ├── streaming.ts           # Vercel AI SDK adapter
│   ├── citations.ts           # Grounding metadata parsing
│   ├── safety.ts              # Input safety validation
│   ├── system-instructions.ts # Agentic system instruction templates
│   ├── types.ts               # Type definitions
│   └── index.ts               # Module exports
├── actions/                   # Server actions (chat save)
├── auth/                      # Authentication utilities
├── redis/                     # Redis configuration
├── supabase/                  # Supabase clients
├── schema/                    # Zod schemas (chat validation)
├── config/                    # Model configuration
├── types/                     # Shared types
└── utils/                     # Utility functions
```

## Gemini Features Used

### Google Search Grounding

Built-in web search that provides:

- Real-time information
- Source metadata for reference display

### Thinking (Gemini 3)

Internal reasoning for complex tasks:

- `thinkingLevel` controls reasoning depth (minimal, low, medium, high)
- `includeThoughts` returns thought summaries

### Deep Research Agent

Autonomous research agent (Gemini 3 Pro):

- Multi-step research planning
- Parallel web searches
- Fact verification
- Comprehensive reports

## Supabase Guidelines

When working with Supabase:

- Use Row Level Security (RLS) policies for data access control
- Create migrations for schema changes
- Use the server client (`lib/supabase/server.ts`) for server-side operations
- Use the browser client (`lib/supabase/client.ts`) for client-side operations
