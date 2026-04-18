import jwt, { type JwtPayload } from "jsonwebtoken";
import axios from "axios";
import type { Socket } from "socket.io";
import config from "../config.js";
import { redisClient } from "../lib/redisClient.js";

export interface SocketData {
  role: "agent" | "visitor";
  userId: string | null;
  workspaceId: string;
  email: string | null;
}

interface AgentJwtPayload extends JwtPayload {
  user_id: string;
  workspace_id: string;
  email?: string;
}

interface WorkspaceApiKeyResponse {
  workspace_id: string;
  workspace_slug: string;
  allowed_domain: string;
}

const CACHE_PREFIX = "apikey:";
const CACHE_SENTINEL_INVALID = "__invalid__";

function verifyJwt(token: string): AgentJwtPayload {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
  }) as AgentJwtPayload;
}

async function validateApiKey(
  apiKey: string
): Promise<WorkspaceApiKeyResponse | null> {
  const cacheKey = `${CACHE_PREFIX}${apiKey}`;

  const cached = await redisClient.get(cacheKey);
  if (cached !== null) {
    if (cached === CACHE_SENTINEL_INVALID) return null;
    return JSON.parse(cached) as WorkspaceApiKeyResponse;
  }

  let workspaceData: WorkspaceApiKeyResponse;
  try {
    const response = await axios.get<WorkspaceApiKeyResponse>(
      `${config.djangoInternalUrl}/api/v1/internal/validate-api-key/`,
      { headers: { "X-Api-Key": apiKey }, timeout: 5000 }
    );
    workspaceData = response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      await redisClient.set(
        cacheKey,
        CACHE_SENTINEL_INVALID,
        "EX",
        config.apiKeyCacheTtl
      );
      return null;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Django API key validation failed: ${message}`);
  }

  await redisClient.set(
    cacheKey,
    JSON.stringify(workspaceData),
    "EX",
    config.apiKeyCacheTtl
  );

  return workspaceData;
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  const { token, apiKey } = (socket.handshake.auth ?? {}) as {
    token?: string;
    apiKey?: string;
  };

  if (token) {
    try {
      const rawToken = token.startsWith("Bearer ") ? token.slice(7) : token;
      const payload = verifyJwt(rawToken);

      if (!payload.user_id || !payload.workspace_id) {
        return next(new Error("AUTH_INVALID_JWT_CLAIMS"));
      }

      socket.data = {
        role: "agent",
        userId: payload.user_id,
        workspaceId: payload.workspace_id,
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

  if (apiKey) {
    try {
      const workspaceData = await validateApiKey(apiKey);
      if (!workspaceData) return next(new Error("AUTH_INVALID_API_KEY"));

      socket.data = {
        role: "visitor",
        userId: null,
        workspaceId: workspaceData.workspace_id,
        email: null,
      } satisfies SocketData;

      return next();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[socketAuth] API key validation error:", message);
      return next(new Error("AUTH_SERVICE_UNAVAILABLE"));
    }
  }

  return next(new Error("AUTH_NO_CREDENTIALS"));
}
