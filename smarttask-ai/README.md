# ⚡ SmartTask AI

An AI-powered task management assistant built on **Cloudflare's Agent platform**.

## Architecture

This project fulfills all four requirements for an AI-powered Cloudflare application:

| Requirement | Implementation |
|---|---|
| **LLM** | Llama 3.3 70B via Workers AI (no API key needed) |
| **Workflow / Coordination** | Durable Objects via the Agents SDK (`AIChatAgent`) |
| **User Input (Chat)** | React chat UI with `useAgentChat` hook + WebSocket |
| **Memory / State** | Agent `setState` for persistent task storage across sessions |

## Features

- **Chat-based task management** — add, complete, and remove tasks via natural language
- **Priority tracking** — high / medium / low with color-coded indicators
- **Progress visualization** — real-time task panel with progress bar
- **Personalization** — remembers your name across sessions
- **Productivity tips** — context-aware advice on demand
- **Streaming responses** — real-time token streaming from the LLM
- **Tool calling** — structured tool use with the Vercel AI SDK

## Project Structure

```
src/
  server.ts    # SmartTaskAgent — chat agent with tools, state, and LLM
  tools.ts     # Tool definitions (addTask, completeTask, removeTask, etc.)
  app.tsx      # React chat UI with task side panel
  client.tsx   # React entry point
  styles.css   # Dark-themed responsive styles
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)

### Install & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Deploy to Cloudflare

```bash
npx wrangler login   # one-time auth
npm run deploy
```

Your agent will be live on Cloudflare's global network.

## How It Works

1. **User sends a message** via the React chat UI over a WebSocket connection
2. **SmartTaskAgent** (a Durable Object) receives the message and calls Llama 3.3 via Workers AI
3. The LLM decides whether to **call a tool** (add task, complete task, etc.) or respond directly
4. Tool results **mutate agent state** (`this.setState`), which persists across sessions and syncs to the UI in real-time
5. The response **streams back** token-by-token to the chat interface

## Tech Stack

- **Runtime**: Cloudflare Workers + Durable Objects
- **AI**: Workers AI (Llama 3.3 70B Instruct)
- **Framework**: Agents SDK (`AIChatAgent`)
- **Frontend**: React 19 + Vite
- **AI SDK**: Vercel AI SDK for streaming + tool calling

## License

MIT
