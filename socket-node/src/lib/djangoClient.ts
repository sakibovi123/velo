import axios from "axios";
import config from "../config.js";

/**
 * Axios client for Node → Django internal HTTP calls.
 * All requests carry X-Internal-Secret so Django's InternalAuthMiddleware
 * accepts them.
 */
const djangoClient = axios.create({
  baseURL: `${config.djangoInternalUrl}/api/v1`,
  headers: {
    "Content-Type": "application/json",
    "X-Internal-Secret": config.internalApiSecret,
  },
  timeout: 5000,
});

djangoClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error?.message ?? err.message;
    console.error(`[djangoClient] ${err.config?.method?.toUpperCase()} ${err.config?.url} → ${err.response?.status}: ${msg}`);
    return Promise.reject(err);
  }
);

// ─── Typed helpers ────────────────────────────────────────────────────────────

export interface DjangoConversation {
  id: string;
  tenant: string;
  visitor_name: string;
  visitor_email: string;
  visitor_socket_id: string;
  required_skill: string | null;
  assigned_agent: string | null;
  status: "open" | "pending" | "resolved";
  visitor_meta: Record<string, unknown>;
}

export interface DjangoMessage {
  id: string;
  sender_type: "visitor" | "agent" | "bot";
  sender_agent: string | null;
  sender_name: string | null;
  text: string;
  created_at: string;
}

/** Create a new Conversation row in Django. */
export async function createConversation(
  payload: Partial<DjangoConversation>
): Promise<DjangoConversation> {
  const { data } = await djangoClient.post("/internal/conversations/", payload);
  return data.data as DjangoConversation;
}

/** Update an existing Conversation (status, assigned_agent, socket_id). */
export async function updateConversation(
  conversationId: string,
  patch: Partial<DjangoConversation>
): Promise<DjangoConversation> {
  const { data } = await djangoClient.patch(
    `/internal/conversations/${conversationId}/`,
    patch
  );
  return data.data as DjangoConversation;
}

/** Persist a single message to Django. */
export async function createMessage(
  conversationId: string,
  payload: {
    sender_type: "visitor" | "agent" | "bot";
    sender_agent?: string | null;
    text: string;
  }
): Promise<DjangoMessage> {
  const { data } = await djangoClient.post(
    `/internal/conversations/${conversationId}/messages/`,
    payload
  );
  return data.data as DjangoMessage;
}
