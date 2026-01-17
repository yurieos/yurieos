# Newcomer's Guide to Yurie Codebase

Welcome to the Yurie codebase! This guide is designed to help you get up to speed quickly with the project structure, key technologies, and important patterns.

## 1. Project Overview

**Yurie** is an AI-powered answer engine with a generative UI. It leverages Google's Gemini API for its core intelligence, supporting text, image, and video generation.

- **Framework**: Next.js 16.1 (App Router)
- **AI**: Google GenAI SDK (`@google/genai`) & Vercel AI SDK (`ai`)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State/Data**: Supabase (optional) & Upstash Redis (optional)

## 2. General Structure

The project follows a standard Next.js App Router structure:

- **`app/`**: Contains the application routes and pages.
  - `(main)/`: The primary application layout with the sidebar.
  - `(auth)/`: Authentication routes (login, signup).
  - `api/`: Backend API routes (chat, images, health check).
- **`lib/`**: The core business logic and utilities.
  - **`gemini/`**: This is the most important folder. It contains all the AI logic, including chat, image/video generation, and tool execution.
  - `schema/`: Zod schemas for data validation.
  - `supabase/` & `redis/`: Database clients.
- **`components/`**: React components.
  - `ui/`: Reusable UI components (shadcn/ui).
  - `chat/`: Components specific to the chat interface.
  - `sidebar/`: Navigation and history components.
- **`hooks/`**: Custom React hooks (e.g., `use-mobile`, `use-scroll-anchor`).

## 3. Important Things to Know

### The Gemini Module (`lib/gemini/`)
This is the heart of the application. It encapsulates all interactions with the Google Gemini API.
- **`core.ts`**: Manages the Gemini client and safety settings.
- **`agentic.ts`**: Handles the agentic chat workflow, where the model can use tools (like search or code execution).
- **`streaming.ts`**: Adapts Gemini responses to the Vercel AI SDK for streaming to the frontend.
- **`image-generation.ts` & `video-generation.ts`**: Logic for generating media.

### Data Flow
1.  **User Input**: A user sends a message via the chat UI (`components/chat/chat.tsx`).
2.  **API Route**: The request hits `app/api/chat/route.ts`.
3.  **Processing**: The `process()` or `agenticChat()` function in `lib/gemini/` is called.
4.  **Streaming**: The response is streamed back to the client using `createGeminiStreamResponse`.

### Environment Variables
You need a `GEMINI_API_KEY` to run the app. Other services like Supabase and Redis are optional but recommended for full functionality (like saving chat history).

## 4. Pointers for Learning Next

If you are new to the codebase, here is a recommended path:

1.  **Start with the UI**: Look at `app/page.tsx` and `components/chat/chat.tsx` to understand how the main interface is composed.
2.  **Trace a Request**: Follow the flow of a chat message from the UI to `app/api/chat/route.ts` and then into `lib/gemini/agentic.ts`. This will show you how the AI responds.
3.  **Explore Tools**: Check `lib/gemini/function-calling/` to see how the AI can execute code or perform calculations.
4.  **Read the Docs**: `CLAUDE.md` and `AGENTS.md` in the root directory contain detailed developer commands and architecture notes.

## 5. Development Commands

- `bun dev`: Start the local development server.
- `bun lint`: Run the linter.
- `bun typecheck`: Check for TypeScript errors.
- `bun format`: Format the code.

Happy coding!
