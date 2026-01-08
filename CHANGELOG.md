# Changelog

All notable changes to Yurie AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-06

### Added

- **Dual Search Modes**
  - Standard Mode with Gemini 3 Flash + Google Search grounding
  - Deep Research Mode with Gemini Deep Research Agent

- **Gemini-Powered Research**
  - Google Search Grounding for real-time web search
  - Configurable thinking levels (minimal, low, medium, high)
  - Thought summaries for transparent AI reasoning
  - Deep Research Agent for comprehensive multi-step research

- **Model Support**
  - Gemini 3 Flash for fast, efficient responses
  - Gemini 3 Pro for advanced reasoning
  - Deep Research Agent for autonomous research

- **Modern UI/UX**
  - Vintage Paper theme with elegant light/dark modes
  - Responsive mobile-first design
  - Custom typography (Libre Baskerville, Lora, IBM Plex Mono)
  - Animated progress for research phases
  - Chain of Thought display

- **Authentication & Storage**
  - Optional Supabase authentication (email/password and OAuth)
  - Redis chat history storage (Upstash)
  - User preferences persistence

- **Safety Features**
  - Prompt injection protection
  - PII redaction
  - Security headers (HSTS, X-Frame-Options, CSP)

- **Developer Experience**
  - Next.js 15.3 with App Router
  - React 19 with Server Components
  - TypeScript 5.7 with strict mode
  - Tailwind CSS + shadcn/ui components
  - Vercel AI SDK 6.0 integration
  - Bun package manager support

- **API Endpoints**
  - `POST /api/chat` - Main chat endpoint
  - `DELETE /api/chat/[id]` - Delete individual chat
  - `GET /api/chats` - Paginated chat history
  - `GET /api/config/models` - Model configuration

- **Documentation**
  - Comprehensive README with setup instructions
  - CLAUDE.md for AI code assistant guidance
  - Configuration guide with troubleshooting
  - Environment variable templates

### Technical Details

- **Framework**: Next.js 16.1.1 (App Router)
- **Runtime**: React 19 with Server Components
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS + shadcn/ui
- **AI SDK**: Vercel AI SDK 6.0
- **AI Provider**: Google GenAI SDK (@google/genai)
- **Auth**: Supabase (optional)
- **Storage**: Upstash Redis (optional)
- **Package Manager**: Bun 1.2.12

---

## [Unreleased]

### Added

- **Error Boundary Components** (`components/error-boundary.tsx`)
  - Generic `ErrorBoundary` for graceful React error handling
  - `ChatErrorBoundary` with chat-specific messaging and recovery options

- **New Chat Button** (`components/new-chat-button.tsx`)
  - Reusable component with header and sidebar variants
  - Smart navigation handling for fresh chat state

### Changed

- **Gemini Module Refactored** (`lib/gemini/`)
  - Renamed `research.ts` → `agentic.ts` for clarity
  - Unified agentic workflow for standard and deep research modes
  - Added model constants: `GEMINI_3_FLASH`, `GEMINI_3_PRO`, `DEEP_RESEARCH_MODEL`
  - Improved thought signature preservation for multi-turn conversations

- **Model Configuration**
  - Gemini 3 Flash default thinking level changed from `minimal` to `medium`
  - Better balance between speed and reasoning depth

### Planned

- Additional model support
- Enhanced search capabilities
- Improved caching strategies
- Performance optimizations

---

[0.1.0]: https://github.com/yurieos/yurieos/releases/tag/v0.1.0
[Unreleased]: https://github.com/yurieos/yurieos/compare/v0.1.0...HEAD
