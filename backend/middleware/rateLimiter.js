import redis from "../config/redis.js";

const WINDOW_SIZE = 60;
const MAX_REQUESTS = 10;

const rateLimiterlua = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call("INCR", key)

if current == 1 then
  redis.call("EXPIRE", key, window)
end

if current > limit then
  return {0, current}
end

return {1, current}
`;

export const rateLimiter = (keyGenerator) => {
  return async (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const result = await redis.eval(
        rateLimiterlua,
        1,
        key,
        MAX_REQUESTS,
        WINDOW_SIZE
      );
      const allowed = result[0] === 1;
      const current = result[1];

      if (!allowed) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Try again later.",
          requests: current,
        });
      }

      next();
    } catch (err) {
      console.log("Rate limiter error:", err.message);

      // Fail open (important)
      next();
    }
  };
};
