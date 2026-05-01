export const ipKey = (req) => {
  if (!req) return "rate:ip:unknown";

  const ip =
    req.headers?.["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown";

  return `rate:ip:${ip}`;
};