# 🧸 Yurie

<div align="center">

**Open-source AI assistant with Gemini and real-time search**

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

---

## ✨ Features

- **Agentic Chat** — Gemini 3 Flash/Pro + Google Search + Code Execution
- **Multimodal Support** — Images, videos, audio, and documents in chat
- **Thinking Mode** — Configurable reasoning depth (minimal, low, medium, high)
- **Modern UI** — Vintage Paper theme with light/dark mode
- **Keyboard Shortcuts** — `⌘O` new chat
- **Optional Auth** — Supabase authentication (email/password, OAuth)
- **Chat History** — Upstash Redis for persistent conversations
- **Safety** — Prompt injection protection, PII redaction
- **Error Recovery** — Typed errors, exponential backoff retry, graceful error boundaries

### Models

| Model          | Features                          |
| -------------- | --------------------------------- |
| Gemini 3 Flash | Fast, efficient, minimal thinking |
| Gemini 3 Pro   | Advanced reasoning, high thinking |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
git clone https://github.com/yurieos/yurieos.git
cd yurieos
npm install
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
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # Biome lint
npm run typecheck     # TypeScript check
npm run format        # Format code
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
src/
├── app/
│   ├── (main)/           # Main app routes (with sidebar)
│   │   └── search/       # Chat conversation pages
│   ├── (auth)/           # Authentication routes
│   ├── (legal)/          # Legal pages (Privacy, Terms)
│   └── api/
│       ├── chat/         # Main chat streaming API
│       ├── attachments/  # File upload API (Gemini Files API)
│       ├── chats/        # Chat list API
│       ├── config/models/# Models configuration API
│       └── health/       # Health check endpoint
├── lib/
│   ├── gemini/           # Gemini AI Module
│   │   ├── core.ts       # Client, citations, safety, URL context
│   │   ├── agentic.ts    # Agentic workflow with tools
│   │   ├── constants.ts  # Centralized API constants
│   │   ├── errors.ts     # Typed error classes
│   │   ├── retry.ts      # Exponential backoff retry
│   │   ├── tokens.ts     # Token estimation utilities
│   │   ├── files.ts      # Gemini Files API (large uploads)
│   │   ├── streaming.ts  # Vercel AI SDK adapter
│   │   ├── system-instructions.ts
│   │   ├── function-calling/
│   │   └── types.ts
│   ├── schema/           # Zod validation schemas
│   ├── supabase/         # Supabase clients
│   ├── redis/            # Redis config
│   ├── config/           # Model configuration
│   └── utils/            # Utilities
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── sidebar/          # Chat history
│   ├── chat/             # Chat-specific components
│   ├── prompt-kit/       # Chain of thought
│   ├── error-boundary.tsx
│   └── ...               # Feature components
├── hooks/
└── proxy.ts              # Next.js 16 proxy (auth session)
```

---

## 🔬 Operation Modes

### Agentic Workflow

```
QUERY → TOOLS (Search + Code Execution + Functions) → SYNTHESIZE
```

Tools available:

- **Google Search** — Real-time web grounding
- **URL Context** — Analyze linked web pages
- **Code Execution** — Run Python in sandbox
- **Function Calling** — Built-in functions (calculator, datetime)

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
3. Run `npm run lint && npm run typecheck && npm run build`
4. Open a Pull Request

---

## 📄 License

[Apache License 2.0](LICENSE)

---

<div align="center">

**Built with 💜 by the Yurie team**

[Issues](https://github.com/yurieos/yurieos/issues)

</div>
