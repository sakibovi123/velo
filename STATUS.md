# Velo — Feature Status by Module

> Legend: ✅ Done · 🔧 Partial · ❌ Not started
> Benchmarked against: `EXISTING_FEAT.md` (Intercom feature parity)

---

## 1. Dashboard — Agent Inbox (`dashboard-next`)
> Route: `(dashboard)/inbox` · Components: `ChatList`, `ConversationView`, `UserDetails`

| Feature | Status | Notes |
|---|---|---|
| Three-pane inbox layout | ✅ | ChatList + ConversationView + UserDetails |
| Real-time conversation list updates | ✅ | Socket `conversation:new`, `conversation:updated` |
| Conversation status (open / pending / resolved) | ✅ | Agent can change status; `chat:end` drains queue |
| Message history (load on select) | ✅ | `GET /conversations/{id}/messages/` |
| Unread message count per conversation | ✅ | Zustand store, cleared on select |
| Search conversations (by visitor name) | ✅ | Client-side filter |
| Filter by status tab (All / Open / Pending / Resolved) | ✅ | Client-side filter |
| Visitor metadata panel (location, browser, OS, URL) | ✅ | `UserDetails.jsx` — Session / Page / History sections |
| Resolve / Pending / Reopen status buttons | ✅ | `ConversationView.jsx` header |
| Agent message bubbles (indigo) + visitor bubbles (white) | ✅ | Styled in `ConversationView.jsx` |
| Send message via Enter key + button | ✅ | `ConversationView.jsx` textarea |
| Conversation Assignment UI (manual assign to agent) | ❌ | No assignee picker; routing is automatic only |
| Internal Notes (agent-only, not visible to visitor) | ❌ | No `is_internal` flag on messages |
| Conversation Tags (label + filter) | ❌ | No Tag model or UI |
| Snooze Conversations | ❌ | No `snoozed_until` field or snoozed tab |
| Merge Conversations | ❌ | No merge endpoint or UI |
| SLA Timers (first reply / resolution countdown) | ❌ | No SLA model or timer UI |
| Custom Saved Filters (beyond status tabs) | ❌ | No multi-criteria filter panel |
| Side Conversations | ❌ | |
| Conversation-to-Ticket Conversion | ❌ | |
| AI Inbox Translations | ❌ | |
| Omnichannel (email, WhatsApp, SMS, phone) | ❌ | Chat (Socket.io) only |
| Pinnable inboxes | ❌ | |

---

## 2. Dashboard — Reporting (`dashboard-next`)
> Route: `(dashboard)/reports` · Currently: nav link exists, no page implemented

| Feature | Status | Notes |
|---|---|---|
| Reporting page skeleton | ❌ | Page exists in nav but renders no data |
| Conversation volume & trend charts | ❌ | |
| Agent performance metrics table | ❌ | |
| First reply time & time-to-close metrics | ❌ | |
| CSAT score chart + per-agent breakdown | ❌ | Depends on CSAT collection feature |
| AI resolution rate reporting | ❌ | |
| Custom report builder (chart visualization options) | ❌ | |
| Emerging trend alerts | ❌ | |
| Folder organization / teammate visibility controls | ❌ | |

---

## 3. Dashboard — Skills Management (`dashboard-next`)
> Route: `(dashboard)/skills` · Backend: `GET/POST /skills/`, `GET/PATCH/DELETE /skills/{id}/`

| Feature | Status | Notes |
|---|---|---|
| Skills CRUD UI (list, create, edit, delete) | ❌ | Backend API exists ✅; no dashboard page |
| Agent skill assignment UI | ❌ | Backend M2M exists ✅; no UI |
| View agents per skill | ❌ | |

---

## 4. Dashboard — Agents Management (`dashboard-next`)
> Route: `(dashboard)/agents` · Backend: `GET/PATCH /agents/`, `GET/PATCH /agents/me/`

| Feature | Status | Notes |
|---|---|---|
| Agent list page (admin) | ❌ | Backend `GET /agents/` exists ✅; no dashboard page |
| Agent detail / edit modal | ❌ | Backend `PATCH /agents/{id}/` exists ✅; no UI |
| Own profile edit (`/agents/me/`) | ❌ | Backend exists ✅; no profile page |
| Invite teammates by email | ❌ | No invite endpoint or UI |
| Role management (admin / agent) | ❌ | Backend `IsWorkspaceAdmin` exists ✅; no role UI |
| Agent presence indicator (online / away / offline) | ❌ | Redis-backed presence exists ✅; not shown in agent list |
| SSO / SCIM | ❌ | |
| Audit / activity logs | ❌ | |

---

## 5. Dashboard — Knowledge Base (`dashboard-next`)
> Route: `(dashboard)/knowledge` · Backend: `GET/POST /rag/documents/`, `GET/PATCH/DELETE /rag/documents/{id}/`

| Feature | Status | Notes |
|---|---|---|
| Document list (title, source URL, active toggle) | ❌ | Backend exists ✅; no dashboard page |
| Create document (title + content + URL) | ❌ | Backend exists ✅; no UI |
| Edit document (inline or modal) | ❌ | Backend exists ✅; no UI |
| Delete document with confirmation | ❌ | Backend exists ✅; no UI |
| Public self-serve Help Center | ❌ | |
| Private / internal articles | ❌ | |
| Multi-collection / categories | ❌ | Single flat collection per workspace |
| Article sync (Zendesk, Salesforce) | ❌ | |
| Multilingual support | ❌ | |

---

## 6. Dashboard — AI Copilot (`dashboard-next`)
> Embedded in `ConversationView` · Backend: `POST /rag/query/` (exists ✅)

| Feature | Status | Notes |
|---|---|---|
| Copilot sidebar panel in ConversationView | ❌ | |
| RAG-powered instant answer suggestions | ❌ | RAG query endpoint exists ✅; not wired to UI |
| Conversation summarization (one-click) | ❌ | No `/conversations/{id}/summarize/` endpoint |
| AI reply drafting / auto-suggest | ❌ | No `/conversations/{id}/draft/` endpoint |
| Access to Notion / Confluence sources | ❌ | |

---

## 7. Dashboard — Workspace Settings (`dashboard-next`)
> Route: `(dashboard)/settings` · Backend: workspace model exists, no settings endpoints

| Feature | Status | Notes |
|---|---|---|
| General settings (workspace name, slug) | ❌ | No `PATCH /workspaces/{id}/` endpoint |
| API Key management UI (list / create / revoke) | ❌ | `WorkspaceApiKey` model exists ✅; no UI |
| Widget branding customization (color, logo) | ❌ | No branding fields on Workspace model |
| Notification preferences (sound, browser alerts) | ❌ | |
| Webhook management UI | ❌ | No Webhook model or endpoints |
| Office hours / routing schedules | ❌ | |
| Multi-brand / multi-workspace support | ❌ | |

---

## 8. Dashboard — Auth (`dashboard-next`)
> Route: `(auth)/login` · JWT via `access_token` cookie

| Feature | Status | Notes |
|---|---|---|
| Login page (email + password) | ✅ | `POST /api/v1/auth/login/` via `simplejwt` |
| JWT stored in cookie, sent as Bearer token | ✅ | |
| Sign out (clear cookie + redirect) | ✅ | Sidebar `LogOut` button |
| Workspace onboarding / self-serve signup | ❌ | Must use Django admin to create workspace |
| Password reset flow | ❌ | |
| SSO login | ❌ | |

---

## 9. Socket Server (`socket-node`)
> Service: `socket-node/src/` · Deps: Redis, Django internal API

| Feature | Status | Notes |
|---|---|---|
| JWT auth middleware (agent connections) | ✅ | `socketAuth.ts` verifies `workspaceId`, `userId`, `role` |
| API key auth (visitor connections) | ✅ | Redis-cached `WorkspaceApiKey` validation |
| Workspace-scoped rooms | ✅ | `workspace:{id}`, `agents:{id}`, `conversation:{id}` |
| Skill-based routing + LAR | ✅ | `routingEngine.ts` — Least Active Routing |
| Atomic slot claim (Lua script) | ✅ | No TOCTOU race on capacity check + increment |
| Redis queue per skill (FIFO) | ✅ | Sorted set, `ZPOPMIN` |
| Queue drain on chat end | ✅ | `handleChatEnd` iterates skill queues |
| Agent presence (online / away / offline) | ✅ | `agent:setPresence` socket event |
| Socket.io Redis adapter (multi-node) | ✅ | `socketAdapter.ts` |
| Auto-reassignment on agent disconnect / away | ❌ | Active conversations not re-queued on disconnect |
| Round-robin / priority routing | ❌ | Only LAR implemented |
| Overflow routing (escalation) | ❌ | |
| Office hours enforcement | ❌ | |

---

## 10. Django REST API (`backend-django`)
> Service: `backend-django/` · Apps: `workspaces`, `accounts`, `conversations`, `skills`, `rag`, `internal`

| Feature | Status | Notes |
|---|---|---|
| Workspace model + isolation (`WorkspaceAwareModel`) | ✅ | All models scoped by `workspace_id` |
| JWT auth (`simplejwt`, custom claims) | ✅ | `workspace_id`, `user_id`, `role`, `email` in token |
| API key auth (`WorkspaceApiKey` + Redis cache) | ✅ | |
| Internal secret auth (Node → Django) | ✅ | `X-Internal-Secret` header |
| CORS configured | ✅ | `django-cors-headers`, `CorsMiddleware` above `CommonMiddleware` |
| Custom error response format | ✅ | `{ success, data, error: { code, message } }` |
| Skill CRUD API | ✅ | `GET/POST /skills/`, `GET/PATCH/DELETE /skills/{id}/` |
| Agent CRUD API | ✅ | `GET/PATCH /agents/`, `GET/PATCH /agents/{id}/`, `GET/PATCH /agents/me/` |
| Conversation + Message API | ✅ | `GET /conversations/`, `GET /conversations/{id}/messages/` |
| RAG document CRUD | ✅ | `GET/POST /rag/documents/`, `GET/PATCH/DELETE /rag/documents/{id}/` |
| RAG query endpoint | ✅ | `POST /rag/query/` — RetrievalQA via gpt-4o-mini |
| pgvector workspace-scoped collections | ✅ | `velo_rag_{workspace_id}` |
| Workspace settings endpoint (`PATCH /workspaces/{id}/`) | ❌ | No update endpoint |
| Invite teammates endpoint (`POST /agents/invite/`) | ❌ | |
| Conversation summarization endpoint | ❌ | `POST /conversations/{id}/summarize/` |
| AI reply draft endpoint | ❌ | `POST /conversations/{id}/draft/` |
| CSAT collection endpoint | ❌ | `POST /conversations/{id}/csat/` |
| Webhook delivery (model + Celery task) | ❌ | |
| SLA policy model + Celery beat checker | ❌ | |
| Contact / Visitor profile model | ❌ | Metadata is per-conversation JSON only |
| Autonomous AI agent endpoint | ❌ | `POST /agent/chat/` |
| Public REST API (documented + versioned) | 🔧 | Endpoints exist; not documented for external use |
| Row-level security (DB-level) | ❌ | Isolation is application-level only |
| GDPR / encryption at rest | ❌ | Postgres default; no explicit config |
| SSO / SCIM | ❌ | |
| Audit logs | ❌ | |
| EU/AU data residency | ❌ | |

---

## 11. Chat Widget (`widget-preact`)
> Embeds via `<velo-widget>` custom element · Shadow DOM CSS isolation

| Feature | Status | Notes |
|---|---|---|
| Preact widget (shadow DOM) | ✅ | CSS isolated, `<velo-widget>` custom element |
| Visitor chat (start / send / receive) | ✅ | `chat:start`, `message:send`, `message:incoming` |
| Queue status display | ✅ | `chat:queued` shows waiting message |
| Agent joined notification | ✅ | `chat:agentJoined` updates widget state |
| Widget states: idle / routing / queued / active / error | ✅ | All states handled |
| API key auth + allowed domain check | ✅ | `WorkspaceApiKey.allowed_domain` |
| JWT visitor identity (prevent impersonation) | ❌ | Widget uses API key only; no visitor identity token |
| CSAT rating UI (post-resolution survey) | ❌ | |
| File / image attachments | ❌ | |
| Sound notifications | ❌ | |
| Branding customization (color, logo, position) | ❌ | Hard-coded styles |
| Multi-tab widget (Home / Messages / Help) | ❌ | Single chat tab only |
| iOS / Android SDKs | ❌ | |

---

## 12. Landing Page (`landing-next`)
> Service: `landing-next/` · Next.js static marketing site

| Feature | Status | Notes |
|---|---|---|
| Landing page scaffold | ✅ | `layout.jsx` + `page.jsx` exist |
| Hero section | ❌ | Empty `page.jsx` |
| Features / product overview section | ❌ | |
| Pricing section | ❌ | |
| CTA / signup button → onboarding flow | ❌ | No onboarding flow exists yet |
| SEO meta tags | ❌ | |
| Responsive mobile layout | ❌ | |

---

## Summary

| Module | Done | Partial | Not Started |
|---|---|---|---|
| Dashboard — Inbox | 12 | 0 | 11 |
| Dashboard — Reporting | 0 | 0 | 9 |
| Dashboard — Skills Mgmt | 0 | 0 | 3 |
| Dashboard — Agents Mgmt | 0 | 0 | 8 |
| Dashboard — Knowledge Base | 0 | 0 | 9 |
| Dashboard — AI Copilot | 0 | 0 | 5 |
| Dashboard — Settings | 0 | 0 | 7 |
| Dashboard — Auth | 3 | 0 | 3 |
| Socket Server | 8 | 0 | 4 |
| Django REST API | 12 | 1 | 13 |
| Chat Widget | 6 | 0 | 8 |
| Landing Page | 1 | 0 | 6 |
| **Total** | **42** | **1** | **86** |
