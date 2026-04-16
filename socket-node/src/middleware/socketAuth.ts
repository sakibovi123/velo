import jwt, { type JwtPayload } from "jsonwebtoken";
import axios from "axios";
import type { Socket } from "socket.io";
import config from "../config.js";
import { redisClient } from "../lib/redisClient.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Shape stamped onto socket.data after successful authentication.
 * Exported so the Server generic in index.ts can reference it, giving
 * fully-typed socket.data inside all connection event handlers.
 */
export interface SocketData {
  role: "agent" | "visitor";
  userId: string | null;
  tenantId: string;
  email: string | null;
}

interface AgentJwtPayload extends JwtPayload {
  user_id: string;
  tenant_id: string;
  email?: string;
}

interface TenantApiKeyResponse {
  tenant_id: string;
  tenant_slug: string;
  allowed_domain: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_PREFIX = "apikey:";
const CACHE_SENTINEL_INVALID = "__invalid__";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verify a JWT issued by Django (djangorestframework-simplejwt, HS256).
 * Expected custom claims: user_id, tenant_id, email.
 */
function verifyJwt(token: string): AgentJwtPayload {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
  }) as AgentJwtPayload;
}

/**
 * Validate a public Tenant API key by calling the Django internal endpoint.
 * Results (valid and invalid) are cached in Redis to avoid a DB round-trip
 * on every widget reconnect.
 *
 * Django must expose:
 *   GET /api/v1/internal/validate-api-key/
 *   Header: X-Api-Key: <key>
 *   200 → { tenant_id, tenant_slug, allowed_domain }
 *   401 → key unknown / inactive
 */
async function validateApiKey(
  apiKey: string
): Promise<TenantApiKeyResponse | null> {
  const cacheKey = `${CACHE_PREFIX}${apiKey}`;

  // 1. Check Redis cache first
  const cached = await redisClient.get(cacheKey);
  if (cached !== null) {
    if (cached === CACHE_SENTINEL_INVALID) return null;
    return JSON.parse(cached) as TenantApiKeyResponse;
  }

  // 2. Call Django
  let tenantData: TenantApiKeyResponse;
  try {
    const response = await axios.get<TenantApiKeyResponse>(
      `${config.djangoInternalUrl}/api/v1/internal/validate-api-key/`,
      { headers: { "X-Api-Key": apiKey }, timeout: 5000 }
    );
    tenantData = response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      // Cache the invalid result to short-circuit future bad-key probes
      await redisClient.set(
        cacheKey,
        CACHE_SENTINEL_INVALID,
        "EX",
        config.apiKeyCacheTtl
      );
      return null;
    }
    // Network errors or unexpected statuses: do NOT cache — let the client retry
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Django API key validation failed: ${message}`);
  }

  // 3. Cache the valid result
  await redisClient.set(
    cacheKey,
    JSON.stringify(tenantData),
    "EX",
    config.apiKeyCacheTtl
  );

  return tenantData;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Socket.io authentication middleware.
 *
 * Clients must send credentials in socket.handshake.auth:
 *   Agent (dashboard):  { token: "<JWT>" }
 *   Visitor (widget):   { apiKey: "<public-tenant-api-key>" }
 *
 * On success, socket.data is populated as SocketData.
 * On failure, next() is called with an Error so Socket.io rejects
 * the handshake before the socket is registered.
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  const { token, apiKey } = (socket.handshake.auth ?? {}) as {
    token?: string;
    apiKey?: string;
  };

  // ── Branch A: JWT (agent) ─────────────────────────────────────────────────
  if (token) {
    try {
      const rawToken = token.startsWith("Bearer ") ? token.slice(7) : token;
      const payload = verifyJwt(rawToken);

      if (!payload.user_id || !payload.tenant_id) {
        return next(new Error("AUTH_INVALID_JWT_CLAIMS"));
      }

      socket.data = {
        role: "agent",
        userId: payload.user_id,
        tenantId: payload.tenant_id,
        email: payload.email ?? null,
      } satisfies SocketData;

      return next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(new Error("AUTH_TOKEN_EXPIRED"));
      }
      return next(new Error("AUTH_INVALID_TOKEN"));
    }
  }

  // ── Branch B: Public API key (visitor) ────────────────────────────────────
  if (apiKey) {
    try {
      const tenantData = await validateApiKey(apiKey);
      if (!tenantData) return next(new Error("AUTH_INVALID_API_KEY"));

      socket.data = {
        role: "visitor",
        userId: null,
        tenantId: tenantData.tenant_id,
        email: null,
      } satisfies SocketData;

      return next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[socketAuth] API key validation error:", message);
      return next(new Error("AUTH_SERVICE_UNAVAILABLE"));
    }
  }

  // ── No credentials provided ───────────────────────────────────────────────
  return next(new Error("AUTH_NO_CREDENTIALS"));
}
