import { Context, Next } from 'hono';

interface RateLimitRecord {
  failedAttempts: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_FAILED_ATTEMPTS = 5;

const ipStore = new Map<string, RateLimitRecord>();

function getClientIp(c: Context): string {
  const cfConnectingIp = c.req.header('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0];
    if (firstIp) return firstIp.trim();
  }

  return '127.0.0.1';
}

export function getRateLimitStatus(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const record = ipStore.get(ip);
  if (!record) {
    return { limited: false, retryAfter: 0 };
  }

  if (now > record.resetAt) {
    ipStore.delete(ip);
    return { limited: false, retryAfter: 0 };
  }

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const remainingMs = Math.max(0, record.resetAt - now);
    const retryAfter = Math.ceil(remainingMs / 1000) || 1;
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

export function isRateLimited(ip: string): boolean {
  return getRateLimitStatus(ip).limited;
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = ipStore.get(ip);

  // Limpieza preventiva de memoria si la tabla supera 500 IPs
  if (ipStore.size > 500) {
    for (const [key, val] of ipStore.entries()) {
      if (now > val.resetAt) {
        ipStore.delete(key);
      }
    }
  }

  if (!record || now > record.resetAt) {
    ipStore.set(ip, {
      failedAttempts: 1,
      resetAt: now + WINDOW_MS,
    });
  } else {
    record.failedAttempts += 1;
  }
}

export function clearFailedAttempts(ip: string): void {
  ipStore.delete(ip);
}

export function resetRateLimitStore(): void {
  ipStore.clear();
}

export async function rateLimitMiddleware(c: Context, next: Next) {
  const ip = getClientIp(c);
  const status = getRateLimitStatus(ip);

  if (status.limited) {
    c.header('Retry-After', String(status.retryAfter));
    return c.json(
      {
        error: 'Demasiados intentos fallidos. Por favor, espera 15 minutos antes de volver a intentar.',
      },
      429
    );
  }

  await next();
}

export { getClientIp };

