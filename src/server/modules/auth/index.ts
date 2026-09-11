import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, authConfig } from '../../db';
import {
  sha256,
  signToken,
  verifyToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionCookie,
  getPinSecret,
} from '../../middlewares/auth';
import {
  rateLimitMiddleware,
  recordFailedAttempt,
  clearFailedAttempts,
  getClientIp,
} from '../../middlewares/rate-limit';

const authApp = new Hono();

// Esquemas Zod
const unlockSchema = z.object({
  pin: z.string().length(6, 'El PIN debe tener exactamente 6 dígitos').regex(/^\d{6}$/, 'El PIN debe ser numérico'),
});

const recoverSchema = z.object({
  a1: z.string().min(1, 'La respuesta 1 es obligatoria'),
  a2: z.string().min(1, 'La respuesta 2 es obligatoria'),
});

const resetPinSchema = z.object({
  token: z.string().min(1, 'El token de recuperación es requerido'),
  newPin: z.string().length(6, 'El nuevo PIN debe tener exactamente 6 dígitos').regex(/^\d{6}$/, 'El PIN debe ser numérico'),
});

// 1. POST /api/auth/unlock — Valida el PIN de 6 dígitos
authApp.post('/unlock', rateLimitMiddleware, async (c) => {
  const ip = getClientIp(c);
  const body = await c.req.json().catch(() => null);
  const parsed = unlockSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb(c);
  const secret = getPinSecret(c);

  const [auth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  if (!auth) {
    return c.json({ error: 'Sistema no configurado o credenciales no sembradas.' }, 500);
  }

  const inputHash = await sha256(parsed.data.pin, secret);
  if (inputHash !== auth.pinHash) {
    recordFailedAttempt(ip);
    return c.json({ error: 'PIN incorrecto. Intente nuevamente.' }, 401);
  }

  // Éxito: limpiar intentos fallidos y emitir cookie de sesión
  clearFailedAttempts(ip);
  const token = await signToken(
    {
      sub: 'session',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
      iat: Date.now(),
    },
    secret
  );

  setSessionCookie(c, token);
  return c.json({ ok: true, message: 'Acceso autorizado.' });
});

// 2. GET /api/auth/questions — Retorna preguntas de seguridad públicas (sin respuestas ni hashes)
authApp.get('/questions', async (c) => {
  const db = getDb(c);
  const [auth] = await db
    .select()
    .from(authConfig)
    .where(eq(authConfig.id, 1))
    .all();

  if (!auth) {
    return c.json({ error: 'No se encontraron preguntas de seguridad configuradas.' }, 404);
  }

  return c.json({ q1: auth.q1, q2: auth.q2 });
});

// 3. POST /api/auth/recover — Valida respuestas secretas y entrega token temporal de 10 min
authApp.post('/recover', rateLimitMiddleware, async (c) => {
  const ip = getClientIp(c);
  const body = await c.req.json().catch(() => null);
  const parsed = recoverSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb(c);
  const secret = getPinSecret(c);

  const [auth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  if (!auth) {
    return c.json({ error: 'Sistema no configurado.' }, 500);
  }

  const inputA1Hash = await sha256(parsed.data.a1, secret);
  const inputA2Hash = await sha256(parsed.data.a2, secret);

  if (inputA1Hash !== auth.a1Hash || inputA2Hash !== auth.a2Hash) {
    recordFailedAttempt(ip);
    return c.json({ error: 'Una o ambas respuestas son incorrectas.' }, 401);
  }

  clearFailedAttempts(ip);
  const resetToken = await signToken(
    {
      sub: 'reset',
      exp: Date.now() + 10 * 60 * 1000, // 10 minutos
      iat: Date.now(),
    },
    secret
  );

  return c.json({ ok: true, resetToken, message: 'Respuestas correctas. Puede configurar un nuevo PIN.' });
});

// 4. POST /api/auth/reset-pin — Valida token temporal y actualiza el PIN
authApp.post('/reset-pin', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = resetPinSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const secret = getPinSecret(c);
  const payload = await verifyToken(parsed.data.token, secret);

  if (!payload || payload.sub !== 'reset') {
    return c.json({ error: 'Token de recuperación inválido o vencido.' }, 401);
  }

  const db = getDb(c);
  const newPinHash = await sha256(parsed.data.newPin, secret);
  const nowIso = new Date().toISOString();

  await db
    .update(authConfig)
    .set({
      pinHash: newPinHash,
      updatedAt: nowIso,
    })
    .where(eq(authConfig.id, 1));

  // Emitir sesión inmediata con el nuevo PIN
  const sessionToken = await signToken(
    {
      sub: 'session',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      iat: Date.now(),
    },
    secret
  );
  setSessionCookie(c, sessionToken);

  return c.json({ ok: true, message: 'PIN actualizado exitosamente.' });
});

// 5. POST /api/auth/lock — Cierra la sesión
authApp.post('/lock', (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true, message: 'Sesión cerrada.' });
});

// 6. GET /api/auth/status — Verifica estado de sesión
authApp.get('/status', async (c) => {
  const cookie = getSessionCookie(c);
  if (!cookie) {
    return c.json({ authenticated: false });
  }

  const secret = getPinSecret(c);
  const payload = await verifyToken(cookie, secret);
  if (!payload || payload.sub !== 'session') {
    return c.json({ authenticated: false });
  }

  return c.json({ authenticated: true });
});

export default authApp;
