# Velo — Full Project Documentation

> Last updated: 2026-04-18
> For new developers. Read this top-to-bottom before touching any code.

---

## Table of Contents

1. [What is Velo?](#1-what-is-velo)
2. [System Architecture](#2-system-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Service 1 — Django REST API](#4-service-1--django-rest-api-backend-django)
5. [Service 2 — Socket.io Node Server](#5-service-2--socketio-node-server-socket-node)
6. [Service 3 — Agent Dashboard](#6-service-3--agent-dashboard-dashboard-next)
7. [Service 4 — Chat Widget](#7-service-4--chat-widget-widget-preact)
8. [Service 5 — Landing Page](#8-service-5--landing-page-landing-next)
9. [Data Models Reference](#9-data-models-reference)
10. [API Endpoints Reference](#10-api-endpoints-reference)
11. [Socket Events Reference](#11-socket-events-reference)
12. [Auth & Security Model](#12-auth--security-model)
13. [Skill-Based Routing Deep Dive](#13-skill-based-routing-deep-dive)
14. [RAG / AI System Deep Dive](#14-rag--ai-system-deep-dive)
15. [Environment Variables](#15-environment-variables)
16. [Local Development Setup](#16-local-development-setup)
17. [What's Built vs What's Needed](#17-whats-built-vs-whats-needed)
18. [Feature Descriptions — What Needs to Be Built](#18-feature-descriptions--what-needs-to-be-built)

---

## 1. What is Velo?

Velo is a **B2B customer support platform** — the Intercom equivalent. It lets businesses embed a chat widget on their website so visitors can talk to support agents in real time. Agents manage all conversations from a shared inbox dashboard. An AI layer (RAG-based) can answer questions automatically using the company's knowledge base.

**Core product loop:**
1. Visitor opens the widget on a business's website → starts a chat
2. The system routes the chat to the best available agent (skill-based routing)
3. Agent sees the conversation in the inbox dashboard, replies in real time
4. If no agent is available, the visitor is queued — assigned when a slot opens
5. The AI can answer visitor questions from the knowledge base at any time

**Target customers:** SaaS companies, e-commerce stores, any business that needs live chat + AI support.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Customer's Website                        │
│   <script src="widget.js">  →  <velo-widget api-key="...">     │
└────────────────────┬────────────────────────────────────────────┘
                     │ WebSocket (Socket.io)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Socket.io Node Server  (port 3001)                  │
│  • Auth: JWT (agents) or API Key (visitors)                      │
│  • Skill-based routing + LAR algorithm                           │
│  • Redis queues per skill                                        │
│  • Emits events to agents + visitors                             │
└───────────┬─────────────────────────────┬───────────────────────┘
            │ Internal HTTP               │ WebSocket (Socket.io)
            │ X-Internal-Secret           │
            ▼                             ▼
┌───────────────────────┐    ┌────────────────────────────────────┐
│  Django REST API       │    │    Agent Dashboard  (port 3000)    │
│  (port 8000)           │    │    Next.js 14 App Router           │
│  • All data storage    │    │    • Shared inbox (3-pane)         │
│  • JWT auth            │    │    • Real-time via Socket.io       │
│  • RAG/AI endpoints    │    │    • Zustand state management      │
│  • pgvector            │    └────────────────────────────────────┘
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐    ┌───────────────────────┐
│    PostgreSQL + pgvec  │    │         Redis          │
│    All app data        │    │  • Agent state         │
│    Vector embeddings   │    │  • API key cache       │
└───────────────────────┘    │  • Skill queues (FIFO) │
                              └───────────────────────┘
```

**Key design decisions:**
- **Two auth paths:** agents use JWT tokens; visitors use API keys (per-domain). The Node server validates both.
- **Node is the real-time layer only.** It does not own any persistent state — all reads/writes go through Django.
- **Workspace isolation is application-level.** Every model has a `workspace_id` foreign key. All queries filter by the requesting user's workspace.
- **Redis is ephemeral state.** Agent presence, chat slot counts, and queued conversations live in Redis. On server restart these are reset (agents need to reconnect and re-emit `agent:setPresence`).

---

## 3. Repository Structure

```
velo/
├── backend-django/          # Service 1 — Python/Django REST API
├── socket-node/             # Service 2 — Node.js Socket.io server
├── dashboard-next/          # Service 3 — Next.js agent dashboard
├── widget-preact/           # Service 4 — Preact embeddable chat widget
├── landing-next/            # Service 5 — Next.js marketing landing page
├── STATUS.md                # Feature completion status (module-by-module)
├── PROJECT_FULL_DOCS.md     # This file
└── EXISTING_FEAT.md         # Intercom feature parity reference list
```

---

## 4. Service 1 — Django REST API (`backend-django`)

### What it does
- Persistent storage for everything: workspaces, users, conversations, messages, skills, RAG documents
- Issues JWTs for agent login
- Validates API keys for visitor connections
- Provides internal HTTP endpoints that the Node server calls to persist data
- Hosts the RAG/AI pipeline (LangChain + pgvector + OpenAI)

### Directory layout

```
backend-django/
├── core_api/
│   ├── settings.py          # All Django config
│   ├── urls.py              # Root URL routing
│   └── wsgi.py
├── core/
│   ├── models.py            # WorkspaceAwareModel base class
│   ├── permissions.py       # IsWorkspaceAdmin permission
│   └── exceptions.py        # Custom exception handler → unified error format
├── apps/
│   ├── workspaces/          # Workspace + WorkspaceApiKey models
│   ├── accounts/            # User model, login, agent CRUD
│   ├── conversations/       # Conversation + Message models + API
│   ├── skills/              # Skill model + CRUD API
│   ├── rag/                 # DocumentContext model + RAG service + API
│   └── internal/            # Node→Django internal endpoints
└── requirements.txt
```

### The `WorkspaceAwareModel` base

Every model that belongs to a workspace inherits from this abstract base:

```python
class WorkspaceAwareModel(models.Model):
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True
```

This means `Skill`, `Conversation`, `Message`, and `DocumentContext` all have `workspace_id` automatically. **Always filter by `workspace=request.user.workspace` in every view.**

### Response format

Every API response uses this envelope — no exceptions:

```json
{ "success": true,  "data": { ... }, "error": null }
{ "success": false, "data": null,    "error": { "code": "some_code", "message": "Human readable" } }
```

The custom exception handler in `core/exceptions.py` ensures even unhandled DRF errors use this format.

---

## 5. Service 2 — Socket.io Node Server (`socket-node`)

### What it does
- Single WebSocket server for all real-time communication
- Authenticates agents (JWT) and visitors (API key) on connection
- Routes new visitor chats to available agents using Least Active Routing
- Queues chats in Redis when no agents are available (FIFO per skill)
- Relays messages between visitors and agents
- Notifies the dashboard of new conversations and status changes

### Directory layout

```
socket-node/src/
├── index.ts                 # Server bootstrap, connection handler
├── config.ts                # Env-driven config object
├── middleware/
│   └── socketAuth.ts        # Auth for every socket connection
├── handlers/
│   └── chatHandlers.ts      # All socket event handlers (chat:start, message:send, etc.)
├── routing/
│   ├── routingEngine.ts     # Core routing logic: routeNewChat, handleChatEnd
│   ├── agentStateService.ts # Agent presence + Redis state (slots, skills, online set)
│   └── queueService.ts      # Redis FIFO queue per skill
└── lib/
    ├── djangoClient.ts      # HTTP client for internal Django endpoints
    ├── redisClient.ts       # ioredis singleton
    └── socketAdapter.ts     # @socket.io/redis-adapter wiring for multi-node
```

### Socket rooms

Every socket joins rooms based on role after connecting:

| Room | Who joins | Purpose |
|---|---|---|
| `workspace:{workspaceId}` | Everyone | Broadcast workspace-wide events (new conversations) |
| `agents:{workspaceId}` | Agents only | Broadcast to all agents in workspace |
| `user:{workspaceId}:{userId}` | Each agent | Direct messages to a specific agent |
| `conversation:{conversationId}` | Visitor + assigned agent | Messages for a specific conversation |

### Redis key patterns

| Key | Type | Purpose |
|---|---|---|
| `agent:{wid}:{uid}:state` | Hash | `presence`, `maxCapacity`, `activeChats` |
| `agent:{wid}:{uid}:skills` | Set | Skill IDs the agent has |
| `agent:{wid}:{uid}:active_chats` | Integer | Current chat count (atomic increment) |
| `workspace:{wid}:agents:online` | Set | User IDs of currently online agents |
| `queue:{wid}:{skillId}` | Sorted Set | FIFO queue of waiting chats (score = enqueuedAt) |
| `apikey:{apiKey}` | String | Cached API key validation result (TTL: 5 min) |

---

## 6. Service 3 — Agent Dashboard (`dashboard-next`)

### What it does
- The web app agents use every day
- Shows the shared inbox: all conversations, real-time messages, visitor metadata
- Agents can reply, change conversation status (open/pending/resolved), view visitor details

### Directory layout

```
dashboard-next/src/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (dashboard)/
│   │   ├── layout.jsx       # Dashboard shell (requires auth)
│   │   └── inbox/page.jsx   # Inbox page (only page built so far)
│   ├── globals.css          # Tailwind + Inter font import
│   └── layout.jsx           # Root layout
├── components/
│   ├── Sidebar.jsx          # Dark sidebar nav (Vapi-style)
│   └── inbox/
│       ├── ChatList.jsx     # Left pane: conversation list + search + tabs
│       ├── ConversationView.jsx  # Center pane: message thread + reply
│       └── UserDetails.jsx  # Right pane: visitor metadata
├── store/
│   └── inboxStore.js        # Zustand store: all conversation state + socket lifecycle
├── lib/
│   ├── axios.js             # Axios instance with JWT interceptor
│   ├── socket.js            # Socket.io client singleton
└── middleware.js            # Next.js middleware: redirect unauthenticated users to /login
```

### State management — `inboxStore`

The entire inbox runs from a single Zustand store. Key shape:

```js
{
  conversations: Conversation[],   // all conversations for this workspace
  activeConversationId: string,    // which conversation is open in the center pane
  isConnected: boolean,            // socket connection state
}
```

**Conversation object shape:**
```js
{
  id: string,               // UUID
  visitorName: string,
  visitorEmail: string | null,
  visitorMeta: object,      // { location, browser, os, pageUrl, referrer, firstSeen }
  status: "open" | "pending" | "resolved",
  unread: number,
  lastMessage: string,
  updatedAt: number,        // epoch ms
  messages: Message[]
}
```

### Auth flow

1. Agent visits `/login` → submits email + password
2. `POST /api/v1/auth/login/` → returns `{ access, refresh, user }`
3. `access` token stored in `document.cookie` as `access_token`
4. Next.js middleware reads this cookie — if missing, redirect to `/login?next=<original path>`
5. `axios.js` request interceptor reads `access_token` cookie and adds `Authorization: Bearer <token>` to every API request
6. Socket connects with `auth: { token }` in the Socket.io handshake

---

## 7. Service 4 — Chat Widget (`widget-preact`)

### What it does
- A small embeddable chat widget that businesses put on their website
- Isolated in Shadow DOM so it never conflicts with the host page's CSS
- Visitors click the launcher button → chat opens → they can send messages to agents

### How to embed

Businesses add this to their website HTML:
```html
<script src="https://cdn.velo.app/widget.js"></script>
<velo-widget api-key="vk_live_..." skill-id="<skill-uuid>"></velo-widget>
```

The `api-key` is a `WorkspaceApiKey` record. The `skill-id` routes the chat to agents with that skill (e.g. "billing", "technical").

### Directory layout

```
widget-preact/src/
├── index.js             # Registers <velo-widget> as a custom element
├── index.jsx            # Mounts the Preact app into Shadow DOM
├── widget.jsx           # Root component — launcher button + ChatWindow toggle
├── components/
│   ├── ChatWindow.jsx   # Chat UI: messages + input + status display
│   └── Message.jsx      # Individual message bubble
├── socket/
│   └── client.js        # Socket.io-client connection using API key auth
└── styles/
    └── widget.css       # Scoped styles (inside Shadow DOM)
```

### Widget states

| State | What the visitor sees |
|---|---|
| `idle` | Launcher button only |
| `routing` | "Connecting to an agent..." |
| `queued` | "All agents are busy. You're in the queue." |
| `active` | Full chat window with agent |
| `error` | "Something went wrong. Please try again." |

### Widget auth

The widget connects to the Socket.io server using the API key (`auth: { apiKey }`). The server validates this against Django (with Redis caching), resolves the workspace, and sets `socket.data.role = "visitor"`.

---

## 8. Service 5 — Landing Page (`landing-next`)

### What it does
Currently just a scaffold. Needs: hero section, features section, pricing, CTA → signup. The signup CTA will link to the workspace onboarding flow once that is built.

```
landing-next/src/app/
├── layout.jsx     # Root layout (font, metadata)
└── page.jsx       # Home page — currently empty
```

---

## 9. Data Models Reference

### `Workspace`
```
id          AutoField (PK)
name        CharField(255)
slug        SlugField(100, unique)
created_at  DateTimeField
updated_at  DateTimeField
```

### `WorkspaceApiKey`
```
id              AutoField (PK)
workspace       FK → Workspace
key             CharField(64, unique) — auto-generated with secrets.token_urlsafe(48)
allowed_domain  CharField(255) — widget only works on this domain
is_active       BooleanField
created_at      DateTimeField
```

### `User` (custom auth model)
```
id               BigAutoField (PK)
email            EmailField (unique, USERNAME_FIELD)
workspace        FK → Workspace (null=True for superusers)
role             CharField — "admin" | "agent"
first_name       CharField
last_name        CharField
skills           M2M → Skill
max_chat_capacity PositiveSmallIntegerField (default: 5)
presence_status  CharField — "online" | "away" | "offline"
is_active        BooleanField
is_staff         BooleanField
date_joined      DateTimeField
```

### `Skill`
```
id          BigAutoField (PK)
workspace   FK → Workspace
name        CharField(100)
description TextField (optional)
created_at  DateTimeField
updated_at  DateTimeField
UNIQUE: (workspace, name)
```

### `Conversation`
```
id               UUIDField (PK)
workspace        FK → Workspace
visitor_name     CharField (default: "Visitor")
visitor_email    EmailField (optional)
visitor_socket_id CharField — current socket.id of the visitor
required_skill   FK → Skill (nullable)
assigned_agent   FK → User (nullable)
status           CharField — "open" | "pending" | "resolved"
visitor_meta     JSONField — { location, browser, os, pageUrl, referrer, firstSeen }
resolved_at      DateTimeField (nullable)
created_at       DateTimeField
updated_at       DateTimeField
```

### `Message`
```
id             UUIDField (PK)
conversation   FK → Conversation
sender_type    CharField — "visitor" | "agent" | "bot"
sender_agent   FK → User (nullable, set when sender_type="agent")
sender_name    CharField (optional)
text           TextField
created_at     DateTimeField
```

### `DocumentContext` (RAG knowledge base)
```
id          BigAutoField (PK)
workspace   FK → Workspace
title       CharField(255)
content     TextField — full document text
source_url  URLField (optional)
is_active   BooleanField
created_at  DateTimeField
updated_at  DateTimeField
```

---

## 10. API Endpoints Reference

All endpoints are prefixed with `/api/v1/`. All responses use the `{ success, data, error }` envelope.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login/` | Public | Returns `{ access, refresh, user }`. Access token is a JWT with `user_id`, `workspace_id`, `role`, `email` claims. |

### Agents (self)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/agents/me/` | JWT | Returns own profile including skills and max_chat_capacity |
| PATCH | `/agents/me/` | JWT | Update own first_name, last_name |

### Agents (admin)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/agents/` | JWT + Admin | List all agents in workspace. Supports `?search=` |
| GET | `/agents/{id}/` | JWT + Admin | Get agent detail |
| PATCH | `/agents/{id}/` | JWT + Admin | Update agent fields |

### Skills
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/skills/` | JWT | List all skills for workspace |
| POST | `/skills/` | JWT + Admin | Create skill |
| GET | `/skills/{id}/` | JWT | Get skill |
| PATCH | `/skills/{id}/` | JWT + Admin | Update skill |
| DELETE | `/skills/{id}/` | JWT + Admin | Delete skill |

### Conversations
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/conversations/` | JWT | List all conversations for workspace |
| GET | `/conversations/{id}/messages/` | JWT | Get message history for a conversation |

### RAG / Knowledge Base
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/rag/documents/` | JWT | List all documents for workspace |
| POST | `/rag/documents/` | JWT | Create document → auto-ingests into pgvector |
| GET | `/rag/documents/{id}/` | JWT | Get document |
| PATCH | `/rag/documents/{id}/` | JWT | Update document → re-embeds automatically |
| DELETE | `/rag/documents/{id}/` | JWT | Delete document + removes pgvector chunks |
| POST | `/rag/query/` | JWT | Query the RAG system. Body: `{ "query": "..." }`. Returns AI-generated answer. |

### Internal (Node → Django only)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/internal/validate-api-key/` | X-Internal-Secret | Validates a widget API key, returns workspace info |
| POST | `/internal/conversations/` | X-Internal-Secret | Create a new conversation record |
| PATCH | `/internal/conversations/{id}/` | X-Internal-Secret | Update conversation (assign agent, change status) |
| POST | `/internal/conversations/{id}/messages/` | X-Internal-Secret | Persist a message |

---

## 11. Socket Events Reference

### Client → Server (Visitor emits)

| Event | Payload | Description |
|---|---|---|
| `chat:start` | `{ chatId, requiredSkillId, visitorName?, visitorEmail?, visitorMeta? }` | Start a new chat. `chatId` is a UUID generated client-side. |
| `message:send` | `{ conversationId, text }` | Send a message in an active conversation |

### Client → Server (Agent emits)

| Event | Payload | Description |
|---|---|---|
| `agent:setPresence` | `{ presence, skillIds?, maxChatCapacity? }` | Set agent online/away/offline. Pass `skillIds` + `maxChatCapacity` on first connect to fully register with the routing engine. |
| `message:send` | `{ conversationId, text }` | Send a reply to a visitor |
| `chat:end` | `{ chatId }` | Mark a chat as resolved. Triggers queue drain — the routing engine will try to assign the next queued visitor to this agent. |

### Server → Client (Dashboard receives)

| Event | Payload | Description |
|---|---|---|
| `conversation:new` | Full conversation object | A new visitor started a chat. Add to the conversation list. |
| `conversation:updated` | `{ conversationId, update }` | A conversation field changed (e.g. status). Merge into local state. |
| `message:incoming` | `{ conversationId, message }` | A new message arrived. Append to conversation's message list. |
| `chat:assigned` | `{ chatId, visitorSocketId }` | The routing engine assigned this chat to this agent. Auto-open the conversation. |
| `chat:closed` | `{ chatId, closedBy, closedAt }` | A chat was closed by an agent. |
| `agent:presenceUpdate` | `{ userId, presence }` | Another agent changed their presence status. |
| `agent:presenceAck` | `{ success, error? }` | Acknowledgement of `agent:setPresence`. |

### Server → Client (Widget receives)

| Event | Payload | Description |
|---|---|---|
| `chat:queued` | `{ chatId, message }` | No agents available. Visitor is in the queue. |
| `chat:agentJoined` | `{ chatId, agentUserId }` | An agent was assigned. Chat is now active. |
| `message:incoming` | `{ conversationId, message }` | An agent sent a message. |
| `chat:error` | `{ code, message }` | Something went wrong (invalid payload, routing failure). |

---

## 12. Auth & Security Model

### Agent Authentication (JWT)

1. Agent logs in via `POST /api/v1/auth/login/`
2. Django returns a `simplejwt` access token (1 day TTL) and refresh token (7 days)
3. The access token contains custom claims:
   ```json
   { "user_id": "42", "workspace_id": "7", "role": "agent", "email": "..." }
   ```
4. Dashboard stores the access token in a cookie: `access_token=<jwt>; path=/; SameSite=Strict`
5. Every API request adds `Authorization: Bearer <token>` via axios interceptor
6. Socket.io connection sends `auth: { token: "<jwt>" }` in the handshake
7. If any API returns 401 (expired token), the axios interceptor clears the cookie and redirects to `/login`

### Visitor Authentication (API Key)

1. Business creates a `WorkspaceApiKey` in the Django admin with an `allowed_domain`
2. Widget embeds the key as an HTML attribute: `api-key="vk_live_..."`
3. Widget socket connects with `auth: { apiKey: "vk_live_..." }`
4. Node server calls Django `GET /internal/validate-api-key/` (with `X-Api-Key` header)
5. Result is cached in Redis for 5 minutes (`apikey:<key>` → JSON string)
6. If the key is invalid, the cached value is the sentinel `"__invalid__"` (to avoid hammering Django)

### Internal Service Auth (Node → Django)

The Node server calls Django internal endpoints with a shared secret header:
```
X-Internal-Secret: <INTERNAL_API_SECRET env var>
```
These endpoints are never exposed publicly. The `InternalAuthentication` class in `apps/internal/authentication.py` validates this header.

### Workspace Isolation

Every database query in a Django view filters by `workspace=request.user.workspace`. The `WorkspaceAwareModel` base class ensures the FK is always present. This is **application-level isolation** — there is no database-level row security. Developers must never forget the workspace filter.

---

## 13. Skill-Based Routing Deep Dive

This is the core of Velo's chat routing. When a visitor starts a chat, the system must decide which agent gets it.

### Algorithm: Least Active Routing (LAR)

When `chat:start` fires:

1. **Get eligible agents** — query Redis for agents in `workspace:{wid}:agents:online` set who have the required skill in their `agent:{wid}:{uid}:skills` set
2. **Sort by active chat count** — for each candidate, read `agent:{wid}:{uid}:active_chats` from Redis, ascending
3. **Try to claim a slot** — for the agent with fewest active chats, run an atomic Lua script:
   ```lua
   local current = tonumber(redis.call("GET", KEYS[1])) or 0
   local max = tonumber(redis.call("GET", KEYS[2])) or 5
   if current < max then
     redis.call("INCR", KEYS[1])
     return 1
   end
   return 0
   ```
   This prevents TOCTOU race conditions — two chats cannot be assigned to the same agent simultaneously.
4. **If claimed** → call Django to persist the assignment → notify agent via `user:{wid}:{uid}` room → notify visitor via their socket ID
5. **If no agent claimed a slot** → enqueue in Redis sorted set `queue:{wid}:{skillId}` with score=timestamp → notify visitor with `chat:queued`

### Queue drain on chat end

When an agent emits `chat:end`:

1. Release the agent's chat slot (`DECR agent:{wid}:{uid}:active_chats`)
2. For each skill the agent has, `ZPOPMIN queue:{wid}:{skillId}` to get the oldest queued chat
3. Try to claim a slot for that chat using the same Lua script
4. If successful, assign the queued chat to this agent
5. If the slot race is lost (another agent grabbed it first), re-enqueue the chat

### Agent registration

On connect, agents emit `agent:setPresence` with their skill IDs and max capacity. The `syncAgentState` function writes all this to Redis atomically. This is why Redis state is ephemeral — if the Node server restarts, agents must reconnect and re-emit their presence.

---

## 14. RAG / AI System Deep Dive

### How it works

Velo uses Retrieval-Augmented Generation (RAG) to answer questions from the knowledge base without making things up.

**Ingestion pipeline** (when a document is created/updated):
1. Document content is split into chunks (1000 chars, 200 char overlap) using `RecursiveCharacterTextSplitter`
2. Each chunk is embedded using `OpenAIEmbeddings` (text-embedding-ada-002)
3. Embeddings are stored in PostgreSQL via the `pgvector` extension in a per-workspace collection: `velo_rag_{workspace_id}`

**Query pipeline** (when `POST /rag/query/` is called):
1. The user's query is embedded using the same embedding model
2. pgvector performs cosine similarity search, returning the top 4 most relevant chunks
3. These chunks are passed as context to `gpt-4o-mini` via LangChain's `RetrievalQA` chain
4. The LLM generates a grounded answer

**Workspace isolation:** Each workspace has its own pgvector collection (`velo_rag_{workspace_id}`). Documents from workspace A are never visible to workspace B.

### Current limitations
- The RAG system only answers queries — there is no autonomous AI agent that initiates responses during conversations. Building that is a future task.
- PDF ingestion is not yet implemented (only text content via the API).
- No re-ranking or hybrid search.

---

## 15. Environment Variables

### `backend-django/.env`

```env
# Core
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=*

# Database (PostgreSQL)
DB_NAME=velo
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

# Auth
JWT_SECRET=your-jwt-secret-key-same-as-node

# Internal service auth
INTERNAL_API_SECRET=your-internal-secret-same-as-node

# AI / RAG
OPENAI_API_KEY=sk-...

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### `socket-node/.env`

```env
PORT=3001
NODE_ENV=development

# Must match Django JWT_SECRET
JWT_SECRET=your-jwt-secret-key-same-as-django

# Must match Django INTERNAL_API_SECRET
INTERNAL_API_SECRET=your-internal-secret-same-as-django

# Django base URL (no trailing slash)
DJANGO_INTERNAL_URL=http://localhost:8000

# Redis
REDIS_URL=redis://localhost:6379

# API key cache TTL in seconds
API_KEY_CACHE_TTL=300
```

### `dashboard-next/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### `widget-preact/.env`

```env
VITE_SOCKET_URL=http://localhost:3001
```

---

## 16. Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Redis 7+

### Step 1 — PostgreSQL setup

```bash
# Create database
createdb velo

# Enable pgvector extension (run inside psql)
psql velo -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Step 2 — Django backend

```bash
cd backend-django

# Create virtual environment
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env file and fill in values
cp .env.example .env

# Run migrations
python manage.py migrate

# Create first workspace + admin user (via Django shell)
python manage.py shell
>>> from apps.workspaces.models import Workspace
>>> from apps.accounts.models import User
>>> ws = Workspace.objects.create(name="Acme Corp", slug="acme")
>>> User.objects.create_user(email="admin@acme.com", password="password123", workspace=ws, role="admin", first_name="Admin", last_name="User")

# Start server
python manage.py runserver 8000
```

### Step 3 — Socket Node server

```bash
cd socket-node
npm install
cp .env.example .env   # fill in values
npm run dev            # starts on port 3001
```

### Step 4 — Agent Dashboard

```bash
cd dashboard-next
npm install
cp .env.local.example .env.local
npm run dev            # starts on port 3000
```

### Step 5 — Chat Widget (for local testing)

```bash
cd widget-preact
npm install
npm run dev            # starts Vite dev server on port 5173
```

### Step 6 — Create an API key for the widget

```bash
# In Django shell
from apps.workspaces.models import Workspace, WorkspaceApiKey
ws = Workspace.objects.get(slug="acme")
key = WorkspaceApiKey.objects.create(workspace=ws, allowed_domain="localhost")
print(key.key)   # copy this value into the widget's api-key attribute
```

Then in your test HTML:
```html
<velo-widget api-key="<key from above>" skill-id="<skill UUID>"></velo-widget>
```

---

## 17. What's Built vs What's Needed

### Already working end-to-end

- Agent login (JWT, cookie-based)
- Real-time chat: visitor starts chat → routed to agent → messages flow both ways
- Skill-based routing with Least Active Routing (LAR)
- Redis queue (FIFO per skill) when no agents are available
- Atomic slot claiming (no race conditions)
- Queue drain when agent resolves a chat
- Agent presence (online / away / offline) via Redis
- Socket.io Redis adapter (multi-node ready)
- Shared inbox dashboard: conversation list, message view, visitor metadata panel
- Conversation status changes (open / pending / resolved)
- Knowledge base CRUD + RAG query (LangChain + pgvector + gpt-4o-mini)
- CORS configured, custom error format, workspace isolation

### Pages that exist in the dashboard

| Route | Status |
|---|---|
| `/login` | ✅ Fully working |
| `/inbox` | ✅ Core working, missing several features |
| `/reports` | ❌ Nav link exists, page is empty |
| `/skills` | ❌ Does not exist yet |
| `/agents` | ❌ Does not exist yet |
| `/knowledge` | ❌ Does not exist yet |
| `/settings` | ❌ Does not exist yet |
| `/forgot-password` | ❌ Does not exist yet |
| `/reset-password` | ❌ Does not exist yet |

---

## 18. Feature Descriptions — What Needs to Be Built

The following describes every missing feature. Each one has a corresponding ClickUp task in list `901817482314`.

---

### Dashboard — Inbox Enhancements

#### Conversation Assignment UI
Agents should be able to manually assign a conversation to a specific agent instead of waiting for the routing engine. UI: avatar in `ConversationView` header that opens an agent picker dropdown. Backend: `PATCH /conversations/{id}/` with `assigned_agent` field + socket event `conversation:assigned`.

#### Internal Notes
Agents need a way to leave private notes on conversations that visitors cannot see (e.g. "Customer is on enterprise plan — escalate if not resolved in 1 hour"). Implementation: `is_internal` boolean field on `Message` model. Toggle in the reply area to switch between "Reply" and "Note" mode. Notes render with a yellow background and lock icon.

#### Conversation Tags
Admins create tags (e.g. "billing", "urgent", "bug-report"). Agents label conversations with tags. Tags can be used to filter the conversation list. Backend: `Tag` model (workspace-scoped), M2M on `Conversation`. Dashboard UI: tag chips in the conversation header.

#### Snooze Conversations
Agents can hide a conversation until a future time (e.g. "Follow up tomorrow"). Backend: `snoozed_until` DateTimeField on `Conversation`. Celery beat task re-opens snoozed conversations when the time passes. Dashboard: snooze button with time picker, snoozed tab in `ChatList`.

#### Merge Conversations
If a visitor opened two separate chats about the same issue, agents can merge them into one. Backend: `POST /conversations/{id}/merge/` — moves messages from source to target, marks source as merged. Dashboard: merge action in conversation menu with target selector.

#### SLA Timers
Define response time targets (e.g. "First reply within 1 hour"). Backend: `SlaPolicy` model, timestamp fields on `Conversation`. Celery beat flags breached SLAs. Dashboard: countdown timer chip in conversation header that turns red when breaching.

#### Custom Saved Filters
The current inbox only filters by status (All/Open/Pending/Resolved). Agents need to filter by assigned agent, skill, tag, and date range. Backend: query params on `GET /conversations/`. Dashboard: filter panel with multi-select dropdowns and saved filter presets.

#### Sound & Browser Notifications
When a new message arrives and the tab is not focused, agents should be notified. Implementation: Web Notifications API for desktop alerts, Web Audio API for a chime sound. Settings to toggle each independently per agent (stored in localStorage).

---

### Dashboard — New Pages

#### Reporting Page
Charts and metrics for workspace admins to understand support performance. Charts needed:
- Conversation volume over time (bar chart, selectable date range)
- Agent performance table (conversations handled, avg reply time, CSAT score)
- First reply time & time-to-close averages
- CSAT scores chart
- AI resolution rate (% of conversations resolved by AI vs human)

Backend: new `GET /api/v1/reports/*` endpoints aggregating `Conversation` + `Message` data.

#### Skills Management Page
A CRUD page for managing skills (e.g. "billing", "technical", "spanish"). Admins can create/edit/delete skills and assign agents to each skill. Backend endpoints already exist. This is purely a new frontend page at `/skills`.

#### Agents Management Page
List all agents in the workspace with their presence status, skills, and role. Admins can edit agent details, invite new agents by email, and change agent roles (admin ↔ agent). Backend endpoints mostly exist — invite and role change need new endpoints.

#### Knowledge Base Management Page
CRUD UI for the RAG document store. Agents/admins can create, edit, and delete knowledge articles. When a document is saved, it is automatically ingested into pgvector. Backend endpoints already exist. New frontend page at `/knowledge`.

#### Workspace Settings Page
Settings for workspace admins:
- **General:** workspace name and slug
- **API Keys:** list, create, and revoke `WorkspaceApiKey` records (the keys used by the widget)
- **Widget Branding:** primary color, logo, widget position (future: live preview)
- **Notifications:** sound on/off, browser alerts on/off (per-agent, stored in localStorage)
- **Webhooks:** register URLs that receive HTTP POST payloads on conversation events

---

### Dashboard — Auth Completions

#### Workspace Onboarding / Signup
Currently workspaces can only be created via the Django admin shell. Need a public `/signup` page: step 1 create workspace (name, slug), step 2 create admin user (name, email, password). Backend: `POST /api/v1/workspaces/` — public endpoint that creates a `Workspace` + first `User` atomically and returns JWT tokens.

#### Password Reset
Standard two-step flow: agent requests reset via email → clicks link → sets new password. Backend: `PasswordResetToken` model, `POST /auth/password-reset/` and `POST /auth/password-reset/confirm/`. Frontend: `/forgot-password` and `/reset-password` pages.

#### Role Management UI
Admins can promote agents to admin or demote admins to agent from the Agents Management page. Backend guard: cannot demote the last admin in a workspace. JWT note: role changes take effect on next login.

---

### Dashboard — AI Copilot

#### Copilot Sidebar
A collapsible panel in `ConversationView` that shows AI-suggested answers as the agent types a reply. Debounces the query (500ms), calls `POST /rag/query/`, shows top 3 results with an "Insert" button that pastes the answer into the reply box.

#### Conversation Summarization
One-click button to generate a 3–5 sentence AI summary of the full conversation thread. Backend: `POST /conversations/{id}/summarize/` — sends message history to gpt-4o-mini with a summarization prompt. Dashboard: summary renders in a collapsible banner above the messages.

#### AI Reply Drafting
"Draft reply" button that generates a suggested reply using the last N messages + RAG context. Backend: `POST /conversations/{id}/draft/`. Agent can edit the suggestion before sending.

---

### Widget Enhancements

#### CSAT Rating
After a conversation resolves, the widget shows a 1–5 star rating prompt. Backend: `POST /conversations/{id}/csat/` saves the rating. Reporting page shows average CSAT per agent and per workspace.

#### Widget Branding Customization
Workspace admin sets primary color, logo URL, and launcher position in Settings. Backend: `branding` JSON field on `Workspace` model. Widget fetches `GET /widget/config/` on init and applies CSS custom properties.

#### JWT Visitor Identity
Currently the widget only uses an API key. To prevent impersonation (one user pretending to be another), businesses can pass a signed JWT with the visitor's identity. This is the same pattern Intercom uses — the backend validates the JWT signature.

---

### Backend — Autonomous AI Agent

The biggest missing feature. Instead of only answering queries on demand, build an AI agent that handles entire conversations. When a chat starts and no human agent is available (or the workspace has configured AI-first routing), the AI responds automatically using the RAG knowledge base + conversation history. Human handoff is triggered when the AI's confidence is low or the visitor explicitly asks for a human.

Implementation:
- LangChain `ConversationalRetrievalChain` with `ConversationBufferMemory`
- New `POST /agent/chat/` endpoint
- Socket server modification: route to AI queue when no human agents are available
- `Message.sender_type` already has "bot" — use this for AI messages

---

*This document covers the complete state of Velo as of 2026-04-18. For task tracking, see [ClickUp list 901817482314](https://app.clickup.com/9018385299/v/l/li/901817482314). For feature completion status by module, see [STATUS.md](./STATUS.md).*
