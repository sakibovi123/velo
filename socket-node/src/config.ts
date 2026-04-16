import "dotenv/config";

interface Config {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  djangoInternalUrl: string;
  redisUrl: string;
  apiKeyCacheTtl: number;
  internalApiSecret: string;
}

const REQUIRED_VARS = [
  "JWT_SECRET",
  "DJANGO_INTERNAL_URL",
  "REDIS_URL",
  "INTERNAL_API_SECRET",
] as const;

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[config] Missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

const config: Config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET!,
  djangoInternalUrl: process.env.DJANGO_INTERNAL_URL!.replace(/\/$/, ""),
  redisUrl: process.env.REDIS_URL!,
  apiKeyCacheTtl: parseInt(process.env.API_KEY_CACHE_TTL ?? "300", 10),
  internalApiSecret: process.env.INTERNAL_API_SECRET!,
};

export default config;
