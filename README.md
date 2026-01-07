# 🧸 Yurie

<div align="center">

**Open-source AI research engine with Gemini deep research and real-time search grounding**

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[Features](#-features) · [Getting Started](#-getting-started) · [Architecture](#-architecture) · [Deep Research](#-deep-research-mode) · [Configuration](#-configuration)

</div>

---

## ✨ Features

### 🔍 Dual Search Modes

- **Standard Mode** — Fast responses with Gemini 3 Flash + Google Search grounding
- **Deep Research Mode** — Comprehensive multi-step research with Gemini Deep Research Agent

### 🧠 Gemini-Powered Research

- **Google Search Grounding** — Real-time web search integrated directly into responses
- **Thinking Mode** — Configurable reasoning depth (minimal, low, medium, high)
- **Thought Summaries** — Transparent AI reasoning displayed during research
- **Deep Research Agent** — Official Gemini API for comprehensive multi-step research

### 🤖 Model Support

| Provider   | Models              | Features                          |
| ---------- | ------------------- | --------------------------------- |
| **Google** | Gemini 3 Flash      | Fast, efficient, medium thinking  |
| **Google** | Gemini 3 Pro        | Advanced reasoning, high thinking |
| **Google** | Deep Research Agent | Autonomous multi-step research    |

### 🎨 Modern UI/UX

- **Vintage Paper Theme** — Elegant light/dark mode with warm aesthetics
- **Responsive Design** — Mobile-first with desktop optimization
- **Typography** — Libre Baskerville, Lora, and IBM Plex Mono fonts
- **Animated Progress** — Polished animations for research phases
- **Chain of Thought Display** — Visual representation of AI thinking

### 🔐 Authentication & Storage

- **Supabase Auth** — Optional email/password and OAuth authentication
- **Redis Chat History** — Upstash Redis for persistent conversations
- **User Preferences** — Model selection saved per user

### 🛡️ Safety Features

- **Prompt Injection Protection** — Guards against malicious inputs
- **PII Redaction** — Automatic sensitive data removal
- **Security Headers** — HSTS, X-Frame-Options, CSP configured

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.2.12+
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yurieos/yurieos.git
cd yurieos

# Install dependencies
bun install

# Copy environment template
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file (or copy from `.env.example`):

```bash
# ===========================================
# Gemini API (Required)
# ===========================================
GEMINI_API_KEY=your-api-key                 # or GOOGLE_API_KEY

# ===========================================
# Optional: Base URL (for production)
# ===========================================
# NEXT_PUBLIC_BASE_URL=https://your-domain.com
# BASE_URL=https://your-domain.com

# ===========================================
# Optional: Chat History (Upstash Redis)
# ===========================================
ENABLE_SAVE_CHAT_HISTORY=false
# UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
# UPSTASH_REDIS_REST_TOKEN=your-token

# ===========================================
# Optional: Authentication (Supabase)
# ===========================================
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
# Start development server with Turbo mode
bun dev

# Build for production
bun run build

# Start production server
bun start

# Code quality
bun lint           # ESLint
bun typecheck      # TypeScript
bun format         # Prettier
bun format:check   # Check formatting
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🏗️ Architecture

### Tech Stack

| Layer               | Technology                                  |
| ------------------- | ------------------------------------------- |
| **Framework**       | Next.js 15.3 (App Router)                   |
| **Runtime**         | React 19 with Server Components             |
| **Language**        | TypeScript 5.7                              |
| **Styling**         | Tailwind CSS + shadcn/ui                    |
| **AI SDK**          | Vercel AI SDK 6.0                           |
| **AI Provider**     | Google GenAI SDK (@google/genai)            |
| **Search**          | Google Search Grounding (built into Gemini) |
| **Auth**            | Supabase                                    |
| **Storage**         | Upstash Redis                               |
| **Package Manager** | Bun                                         |

### Project Structure

```
yurie/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── chat/                 # Main chat API (Gemini)
│   │   ├── chats/                # Chat history API
│   │   └── config/models/        # Model configuration API
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │   └── update-password/
│   ├── search/[id]/              # Chat conversation pages
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles & animations
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── markdown.tsx          # Markdown renderer with KaTeX
│   │   └── ...
│   ├── prompt-kit/               # Chain of thought display
│   │   └── chain-of-thought.tsx
│   ├── sidebar/                  # Chat history sidebar
│   ├── chat.tsx                  # Main chat component
│   ├── chat-panel.tsx            # Input panel with mode toggle
│   └── ...
│
├── lib/
│   ├── gemini/                   # Gemini Research Module
│   │   ├── client.ts             # Singleton GoogleGenAI client
│   │   ├── research.ts           # Research workflow (standard + deep)
│   │   ├── deep-research-agent.ts # Official Deep Research Agent
│   │   ├── streaming.ts          # Vercel AI SDK adapter
│   │   ├── citations.ts          # Grounding metadata parsing
│   │   ├── safety.ts             # Input safety validation
│   │   ├── system-instructions.ts # Agentic system instruction templates
│   │   ├── types.ts              # Type definitions
│   │   └── index.ts              # Module exports
│   │
│   ├── supabase/                 # Supabase client utilities
│   ├── redis/                    # Upstash Redis configuration
│   ├── auth/                     # Authentication utilities
│   ├── actions/                  # Server actions
│   ├── schema/                   # Zod validation schemas
│   ├── config/                   # Model configuration
│   ├── types/                    # Shared TypeScript types
│   └── utils/                    # Utility functions
│
├── hooks/                        # React hooks
├── docs/
│   └── CONFIGURATION.md          # Setup guide
└── ...config files
```

---

## 🔬 Deep Research Mode

Deep Research uses the official Gemini Deep Research Agent via the Interactions API:

```
┌─────────────────────────────────────────────────────────────────┐
│  QUERY → PLAN → SEARCH → ANALYZE → VERIFY → SYNTHESIZE         │
└─────────────────────────────────────────────────────────────────┘
```

### Research Workflow

| Phase                | Description                                        |
| -------------------- | -------------------------------------------------- |
| **🧠 Understanding** | Agent analyzes query and plans research strategy   |
| **🔍 Searching**     | Multiple web searches with Google Search grounding |
| **📊 Analyzing**     | Evaluates and synthesizes information from sources |
| **✅ Verifying**     | Cross-references facts across sources              |
| **✨ Synthesizing**  | Generates comprehensive cited response             |

### Thinking Levels

Gemini 3 models support configurable thinking depth:

| Level       | Use Case                            |
| ----------- | ----------------------------------- |
| **minimal** | Simple, fast responses (Flash only) |
| **low**     | Quick reasoning tasks               |
| **medium**  | Balanced reasoning (Flash default)  |
| **high**    | Complex analysis (Pro default)      |

### Features

- **Background Execution** — Research runs asynchronously (5-60 minutes)
- **Streaming Progress** — Real-time updates during research
- **Reconnection Support** — Resume interrupted research
- **Follow-up Questions** — Continue conversation after completion
- **Thought Summaries** — Transparent reasoning process

---

## ⚙️ Configuration

### Model Configuration

Models are configured in `lib/config/models.ts`:

```typescript
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

> **Note:** Model changes require a rebuild. This keeps configuration secure (not publicly exposed) and simplifies the codebase.

### Supabase Authentication (Optional)

1. Create a project at [Supabase](https://supabase.com/)
2. Enable Email auth or OAuth providers
3. Add credentials to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Redis Chat History (Optional)

1. Create a database at [Upstash Console](https://console.upstash.com/redis)
2. Copy REST API credentials from the Details tab
3. Configure in `.env.local`:

```bash
ENABLE_SAVE_CHAT_HISTORY=true
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

For detailed setup instructions, see [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

---

## 🎨 Design System

### Theme

Yurie uses a custom "Vintage Paper" theme with warm, elegant colors:

| Element    | Light Mode    | Dark Mode  |
| ---------- | ------------- | ---------- |
| Background | Warm cream    | Deep brown |
| Foreground | Rich sepia    | Warm cream |
| Primary    | Caramel brown | Golden tan |
| Accent     | Muted gold    | Copper     |

### Typography

| Purpose              | Font              |
| -------------------- | ----------------- |
| **Sans (Headlines)** | Libre Baskerville |
| **Serif (Body)**     | Lora              |
| **Monospace (Code)** | IBM Plex Mono     |

### Animations

Custom CSS animations for research UI include:

- Phase transitions with subtle fades
- Source card pop-in effects
- Shimmer loading states
- Chain of thought reveals
- Motion-reduced alternatives for accessibility

---

## 🧪 Development

### Commands

| Command            | Description                         |
| ------------------ | ----------------------------------- |
| `bun dev`          | Start development server with Turbo |
| `bun run build`    | Production build                    |
| `bun start`        | Start production server             |
| `bun lint`         | Run ESLint                          |
| `bun typecheck`    | TypeScript type checking            |
| `bun format`       | Format with Prettier                |
| `bun format:check` | Check formatting                    |

### Pre-Commit Checklist

Before creating a PR, ensure all checks pass:

```bash
bun lint          # ✅ No ESLint errors
bun typecheck     # ✅ No TypeScript errors
bun format:check  # ✅ Code properly formatted
bun run build     # ✅ Builds successfully
```

### Key Development Patterns

| Pattern               | Description                                |
| --------------------- | ------------------------------------------ |
| **Server Components** | Used for initial data fetching and layout  |
| **Client Components** | Interactive UI marked with `'use client'`  |
| **Server Actions**    | Database operations in `/lib/actions/`     |
| **Streaming**         | Real-time updates via Vercel AI SDK        |
| **Type Safety**       | Zod schemas for runtime validation         |
| **Async Generators**  | Research flows through generator functions |

---

## 📡 API Routes

| Route                | Method | Description                   |
| -------------------- | ------ | ----------------------------- |
| `/api/chat`          | POST   | Main chat endpoint (Gemini)   |
| `/api/chat/[id]`     | DELETE | Delete individual chat        |
| `/api/chats`         | GET    | Paginated chat history        |
| `/api/config/models` | GET    | Available model configuration |

### Chat API Request

```typescript
POST /api/chat
Content-Type: application/json

{
  "id": "chat-id",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "Your question here" }]
    }
  ],
  "mode": "standard" | "deep-research"
}
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com/)
3. Add environment variables in the Vercel dashboard
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

### Environment Variables for Production

Ensure all required environment variables are set:

```bash
# Required
GEMINI_API_KEY=...              # or GOOGLE_API_KEY

# Recommended
ENABLE_SAVE_CHAT_HISTORY=true
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Run** all quality checks (`bun lint && bun typecheck && bun run build`)
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing patterns and conventions
- Add JSDoc comments for public APIs
- Write meaningful commit messages

---

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

---

## 🙏 Acknowledgments

- [Google GenAI SDK](https://ai.google.dev/) — Gemini API integration
- [Vercel AI SDK](https://sdk.vercel.ai/) — Streaming primitives
- [shadcn/ui](https://ui.shadcn.com/) — Beautiful components
- [Supabase](https://supabase.com/) — Authentication
- [Upstash](https://upstash.com/) — Serverless Redis

---

<div align="center">

**Built with 💜 by the Yurie team**

[Documentation](docs/) · [Issues](https://github.com/yurieos/yurieos/issues)

</div>
