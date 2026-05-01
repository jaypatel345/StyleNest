import Redis from "ioredis";

let redis;

if (!global.redis) {
  global.redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  global.redis.on("connect", () => {
    console.log("Redis connected");
  });

  global.redis.on("error", (err) => {
    console.error("Redis error:", err);
  });
}

redis = global.redis;

export default redis;