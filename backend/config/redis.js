import Redis from "ioredis";

let redis;

const redisUrl = process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === "production";

if (!redisUrl && !isProduction) {
  console.log("Redis disabled: REDIS_URL is not configured");
} else if (!global.redis) {
  global.redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: isProduction ? 3 : 1,
    connectTimeout: isProduction ? 10000 : 500,
    enableReadyCheck: true,
  });

  global.redis.on("connect", () => {
    console.log("Redis connected");
  });

  global.redis.on("error", (err) => {
    console.error("Redis error:", err);
  });
}

redis = global.redis || null;

export default redis;
