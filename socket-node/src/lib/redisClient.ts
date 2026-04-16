import Redis from "ioredis";
import config from "../config.js";

function createClient(name: string): Redis {
  const client = new Redis(config.redisUrl, {
    lazyConnect: false,
    // Required by @socket.io/redis-adapter — allows the adapter to manage
    // its own retry logic without ioredis interfering on blocked commands.
    maxRetriesPerRequest: null,
  });

  client.on("connect", () => console.log(`[redis:${name}] connected`));
  client.on("error", (err: Error) =>
    console.error(`[redis:${name}] error:`, err.message)
  );

  return client;
}

// General-purpose client for caching (API key lookups, etc.)
export const redisClient: Redis = createClient("main");

// Dedicated pub/sub pair required by the Socket.io Redis adapter.
// ioredis clients used for subscribe cannot issue regular commands,
// so the adapter needs two separate connections.
export const pubClient: Redis = createClient("pub");
export const subClient: Redis = createClient("sub");
