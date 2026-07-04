import { NextFunction, Request, Response, Router } from "express";
import { registerPublicAthlete } from "../controllers/publicRegistrationController";

const router = Router();

type RateBucket = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = Number(
  process.env.PUBLIC_REGISTRATION_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000,
);
const MAX_REQUESTS_PER_SESSION = Number(
  process.env.PUBLIC_REGISTRATION_RATE_LIMIT_SESSION_MAX || 3000,
);
const MAX_REQUESTS_PER_IP = Number(
  process.env.PUBLIC_REGISTRATION_RATE_LIMIT_IP_MAX || 600,
);
const rateBuckets = new Map<string, RateBucket>();

function consumeRateLimit(key: string, maxRequests: number, now: number) {
  const current = rateBuckets.get(key);

  if (!current || current.resetAt <= now) {
    const nextBucket = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    rateBuckets.set(key, nextBucket);
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt: nextBucket.resetAt,
    };
  }

  current.count += 1;
  return {
    allowed: current.count <= maxRequests,
    remaining: Math.max(0, maxRequests - current.count),
    resetAt: current.resetAt,
  };
}

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of rateBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateBuckets.delete(key);
    }
  }
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}

function publicRegistrationRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const now = Date.now();
  const testSessionSlug = String(req.params.testSessionSlug || "unknown");
  const clientIp = getClientIp(req);

  cleanupExpiredBuckets(now);

  const sessionLimit = consumeRateLimit(
    `session:${testSessionSlug}`,
    MAX_REQUESTS_PER_SESSION,
    now,
  );
  const ipLimit = consumeRateLimit(`ip:${clientIp}`, MAX_REQUESTS_PER_IP, now);
  const retryAfterSeconds = Math.ceil(
    (Math.min(sessionLimit.resetAt, ipLimit.resetAt) - now) / 1000,
  );

  res.setHeader("X-RateLimit-Limit-Session", String(MAX_REQUESTS_PER_SESSION));
  res.setHeader("X-RateLimit-Remaining-Session", String(sessionLimit.remaining));
  res.setHeader("X-RateLimit-Limit-IP", String(MAX_REQUESTS_PER_IP));
  res.setHeader("X-RateLimit-Remaining-IP", String(ipLimit.remaining));

  if (!sessionLimit.allowed || !ipLimit.allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message:
        "Çok fazla kayıt denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin.",
      code: "PUBLIC_REGISTRATION_RATE_LIMITED",
    });
  }

  return next();
}

router.post(
  "/test-sessions/:testSessionSlug/registrations",
  publicRegistrationRateLimit,
  registerPublicAthlete,
);

export default router;
