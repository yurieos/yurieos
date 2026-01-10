# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Sidebar Icon Mode**: Desktop sidebar now collapses to icon-only mode (3rem) instead of hiding completely
- **Sidebar Tooltips**: Menu buttons show tooltips when sidebar is collapsed
- **Mobile Branding**: Bear emoji and "Yurie" text now visible in mobile header
- **Legal Pages**: Privacy Policy (`/privacy`) and Terms of Service (`/terms`) for Google OAuth verification
- **Search Chats Command**: `⌘K` / `Ctrl+K` to search through chat history with grouped results (Today, Yesterday, Previous 7 Days, Older)
- **Keyboard Shortcuts**: `⌘O` / `Ctrl+O` for new chat, `⌘K` / `Ctrl+K` for search
- **Error Boundaries**: `ErrorBoundary` and `ChatErrorBoundary` components for graceful error handling
- **New Chat Button**: Reusable component with header and sidebar variants (`components/new-chat-button.tsx`)
- **Health Check Endpoint**: `/api/health` for deployment verification and monitoring
- **Deep Research Reconnection**: `reconnectToResearch()` function to resume interrupted research tasks
- **Model Schema Validation**: Zod-based validation for model cookie parsing (`lib/schema/model.ts`)

### Changed

- **Sidebar Redesign**: Changed from `offcanvas` to `icon` collapsible mode for desktop
- **Sidebar Background**: Now matches main page background color in both light and dark modes
- **Header Width**: Adjusts for collapsed sidebar icon width on desktop
- **Production Domain**: Updated `metadataBase` to `https://www.yurie.ai`
- **Gemini Module Refactored**: Renamed `research.ts` → `agentic.ts`, consolidated citations and safety into `core.ts`
- **Thinking Level Default**: Gemini 3 Flash now defaults to `medium` thinking (was `minimal`)
- **Hooks Consolidated**: All hooks now in `hooks/index.ts` (removed separate files)
- **Auth Forms Consolidated**: All auth forms now in `components/auth-forms.tsx` (removed separate form files)
- **Sidebar Simplified**: Removed `chat-history-section.tsx` and `chat-history-skeleton.tsx`
- **Chat Page**: Wrapped with `ChatErrorBoundary` for graceful error handling

### Removed

- `lib/gemini/citations.ts` (merged into `core.ts`)
- `lib/gemini/safety.ts` (merged into `core.ts`)
- `lib/gemini/client.ts` (merged into `core.ts`)
- `components/custom-link.tsx`
- `components/login-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`
- `hooks/use-copy-to-clipboard.ts`, `hooks/use-current-user-name.ts`, `hooks/use-mobile.ts`
- `lib/types/models.ts`, `lib/types/sources.ts` (consolidated into `lib/types/index.ts`)
- `docs/CONFIGURATION.md` (content moved to README)

---

## [0.1.0] - 2026-01-06

### Added

- **Dual Search Modes**: Standard (Gemini 3 Flash + tools) and Deep Research (Gemini Deep Research Agent)
- **Gemini Features**: Google Search grounding, Code Execution, configurable thinking levels, thought summaries
- **Models**: Gemini 3 Flash, Gemini 3 Pro, Deep Research Agent
- **UI/UX**: Vintage Paper theme, responsive design, Chain of Thought display
- **Auth & Storage**: Optional Supabase auth, Upstash Redis chat history
- **Safety**: Prompt injection protection, PII redaction, security headers

### Technical

- Next.js 16.1, React 19, TypeScript 5.7
- Tailwind CSS + shadcn/ui
- Vercel AI SDK 6.0, Google GenAI SDK

---

[0.1.0]: https://github.com/yurieos/yurieos/releases/tag/v0.1.0
[Unreleased]: https://github.com/yurieos/yurieos/compare/v0.1.0...HEAD
