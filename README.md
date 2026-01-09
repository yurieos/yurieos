# 🧸 Yurie

<div align="center">

**Open-source AI research engine with Gemini deep research and real-time search grounding**

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

---

## ✨ Features

- **Standard Mode** — Fast responses with Gemini 3 Flash + Google Search + Code Execution
- **Deep Research Mode** — Comprehensive multi-step research with Gemini Deep Research Agent
- **Thinking Mode** — Configurable reasoning depth (minimal, low, medium, high)
- **Modern UI** — Vintage Paper theme with light/dark mode
- **Keyboard Shortcuts** — `⌘K` search, `⌘O` new chat
- **Optional Auth** — Supabase authentication (email/password, OAuth)
- **Chat History** — Upstash Redis for persistent conversations
- **Safety** — Prompt injection protection, PII redaction
- **Error Recovery** — Graceful error boundaries with retry functionality

### Models

| Model               | Features                          |
| ------------------- | --------------------------------- |
| Gemini 3 Flash      | Fast, efficient, medium thinking  |
| Gemini 3 Pro        | Advanced reasoning, high thinking |
| Deep Research Agent | Autonomous multi-step research    |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.2.12+
- [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
git clone https://github.com/yurieos/yurieos.git
cd yurieos
bun install
cp .env.example .env.local
```

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your-api-key

# Optional: Chat History (Upstash Redis)
ENABLE_SAVE_CHAT_HISTORY=true
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Optional: Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
bun dev           # Start dev server
bun run build     # Production build
bun lint          # ESLint
bun typecheck     # TypeScript check
```

Visit [http://localhost:3000](http://localhost:3000)

### Health Check

```bash
curl http://localhost:3000/api/health
```

Returns service status for Gemini, Redis, and Supabase.

---

## 🏗️ Architecture

### Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Next.js 16.1 (App Router)           |
| Runtime   | React 19, TypeScript 5.7            |
| Styling   | Tailwind CSS + shadcn/ui            |
| AI        | Google GenAI SDK, Vercel AI SDK 6.0 |
| Auth      | Supabase (optional)                 |
| Storage   | Upstash Redis (optional)            |

### Project Structure

```
app/
├── (legal)/          # Legal pages (Privacy, Terms)
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
│   └── types.ts
├── schema/           # Zod validation schemas
├── supabase/         # Supabase clients
├── redis/            # Redis config
├── config/           # Model configuration
└── utils/            # Utilities

components/
├── ui/               # shadcn/ui components
├── sidebar/          # Chat history
├── prompt-kit/       # Chain of thought
├── error-boundary.tsx
└── ...               # Feature components
```

---

## 🔬 Operation Modes

### Standard Mode (Agentic AI)

```
QUERY → TOOLS (Search + Code Execution) → SYNTHESIZE
```

### Deep Research Mode

```
QUERY → PLAN → SEARCH → ANALYZE → VERIFY → SYNTHESIZE
```

Research takes 5-60 minutes with streaming progress updates. Supports reconnection to interrupted tasks.

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/)
3. Add environment variables
4. Deploy

### Health Monitoring

The `/api/health` endpoint returns:

- `200 OK` when Gemini is available
- `503 Service Unavailable` when Gemini is not configured

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Run `bun lint && bun typecheck && bun run build`
4. Open a Pull Request

---

## 📄 License

[Apache License 2.0](LICENSE)

---

<div align="center">

**Built with 💜 by the Yurie team**

[Issues](https://github.com/yurieos/yurieos/issues)

</div>
