import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, authConfig, seedInitialAuthIfNeeded } from '../../db';
import {
  sha256,
  timingSafeEqual,
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
import { sanitizeString } from '../../middlewares/sanitize';

const authApp = new Hono();

// Esquemas Zod cacheados fuera de los handlers
export const unlockSchema = z.object({
  pin: z
    .string({ required_error: 'El PIN es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El PIN debe tener exactamente 8 dígitos numéricos'),
});

export const recoverSchema = z.object({
  a1: z
    .string({ required_error: 'La respuesta 1 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'La respuesta 1 no puede estar vacía')
    .refine((v) => v.length <= 200, 'La respuesta no puede superar 200 caracteres'),
  a2: z
    .string({ required_error: 'La respuesta 2 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'La respuesta 2 no puede estar vacía')
    .refine((v) => v.length <= 200, 'La respuesta no puede superar 200 caracteres'),
});

export const resetPinSchema = z.object({
  token: z
    .string({ required_error: 'El token de recuperación es requerido' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'El token de recuperación no puede estar vacío')
    .refine((v) => v.length <= 1000, 'Token inválido'),
  newPin: z
    .string({ required_error: 'El nuevo PIN es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El nuevo PIN debe tener exactamente 8 dígitos numéricos'),
});

export const changePinSchema = z.object({
  currentPin: z
    .string({ required_error: 'El PIN actual es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El PIN actual debe tener exactamente 8 dígitos numéricos'),
  newPin: z
    .string({ required_error: 'El nuevo PIN es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El nuevo PIN debe tener exactamente 8 dígitos numéricos'),
});

export const updateQuestionsSchema = z.object({
  currentPin: z
    .string({ required_error: 'El PIN actual es requerido para autorizar el cambio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El PIN actual debe tener exactamente 8 dígitos numéricos'),
  q1: z
    .string({ required_error: 'La pregunta 1 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 3, 'La pregunta 1 debe tener al menos 3 caracteres')
    .refine((v) => v.length <= 200, 'La pregunta 1 no puede superar 200 caracteres'),
  a1: z
    .string({ required_error: 'La respuesta 1 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'La respuesta 1 no puede estar vacía')
    .refine((v) => v.length <= 200, 'La respuesta 1 no puede superar 200 caracteres'),
  q2: z
    .string({ required_error: 'La pregunta 2 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 3, 'La pregunta 2 debe tener al menos 3 caracteres')
    .refine((v) => v.length <= 200, 'La pregunta 2 no puede superar 200 caracteres'),
  a2: z
    .string({ required_error: 'La respuesta 2 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'La respuesta 2 no puede estar vacía')
    .refine((v) => v.length <= 200, 'La respuesta 2 no puede superar 200 caracteres'),
});

export type UnlockInput = z.infer<typeof unlockSchema>;
export type RecoverInput = z.infer<typeof recoverSchema>;
export type ResetPinInput = z.infer<typeof resetPinSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
export type UpdateQuestionsInput = z.infer<typeof updateQuestionsSchema>;

// 1. POST /api/auth/unlock — Valida el PIN de 8 dígitos
authApp.post('/unlock', rateLimitMiddleware, async (c) => {
  const ip = getClientIp(c);
  const body = await c.req.json().catch(() => null);
  const parsed = unlockSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'El PIN debe tener 8 dígitos numéricos.' }, 400);
  }

  const db = getDb(c);
  const secret = getPinSecret(c);

  let [auth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  if (!auth) {
    // Si la BD está recién migrada (ej. Cloudflare D1 en frío), auto-sembrar credenciales iniciales
    await seedInitialAuthIfNeeded(db, secret);
    [auth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  }

  if (!auth) {
    return c.json({ error: 'Sistema no configurado o credenciales no sembradas.' }, 500);
  }

  const inputHash = await sha256(parsed.data.pin, secret);
  if (!timingSafeEqual(inputHash, auth.pinHash)) {
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
  let [auth] = await db
    .select()
    .from(authConfig)
    .where(eq(authConfig.id, 1))
    .all();

  if (!auth) {
    const secret = getPinSecret(c);
    await seedInitialAuthIfNeeded(db, secret);
    [auth] = await db
      .select()
      .from(authConfig)
      .where(eq(authConfig.id, 1))
      .all();
  }

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
    return c.json({ error: parsed.error.issues[0]?.message || 'Respuestas requeridas inválidas.' }, 400);
  }

  const db = getDb(c);
  const secret = getPinSecret(c);

  const [auth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  if (!auth) {
    return c.json({ error: 'Sistema no configurado.' }, 500);
  }

  const inputA1Hash = await sha256(parsed.data.a1, secret);
  const inputA2Hash = await sha256(parsed.data.a2, secret);

  const match1 = timingSafeEqual(inputA1Hash, auth.a1Hash);
  const match2 = timingSafeEqual(inputA2Hash, auth.a2Hash);

  if (!match1 || !match2) {
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
    return c.json({ error: parsed.error.issues[0]?.message || 'Datos de nuevo PIN inválidos.' }, 400);
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

// Helper para validar estado de autenticación (sesión activa)
async function checkAuthStatus(c: any) {
  let token = getSessionCookie(c);
  if (!token) {
    const authHeader = c.req.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    return c.json({ authenticated: false });
  }

  const secret = getPinSecret(c);
  const payload = await verifyToken(token, secret);
  if (!payload || payload.sub !== 'session') {
    return c.json({ authenticated: false });
  }

  return c.json({ authenticated: true });
}

// 6. GET /api/auth/status y GET /api/auth/me — Verifica estado de sesión activa
authApp.get('/status', checkAuthStatus);
authApp.get('/me', checkAuthStatus);

// 7. GET /api/auth/settings — Retorna preguntas de seguridad actuales para la vista de configuración
authApp.get('/settings', async (c) => {
  const db = getDb(c);
  const [auth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  if (!auth) {
    return c.json({ error: 'Configuración no encontrada.' }, 404);
  }
  return c.json({
    q1: auth.q1,
    q2: auth.q2,
    updatedAt: auth.updatedAt,
  });
});

// 8. POST /api/auth/change-pin — Cambia el PIN maestro tras validar el PIN actual
authApp.post('/change-pin', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = changePinSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Datos de PIN inválidos.' }, 400);
  }

  const db = getDb(c);
  const secret = getPinSecret(c);
  const [auth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  if (!auth) {
    return c.json({ error: 'Configuración no encontrada.' }, 500);
  }

  // Verificar PIN actual
  const currentHash = await sha256(parsed.data.currentPin, secret);
  if (!timingSafeEqual(currentHash, auth.pinHash)) {
    return c.json({ error: 'El PIN actual ingresado es incorrecto.' }, 401);
  }

  const newPinHash = await sha256(parsed.data.newPin, secret);
  const nowIso = new Date().toISOString();

  await db
    .update(authConfig)
    .set({
      pinHash: newPinHash,
      updatedAt: nowIso,
    })
    .where(eq(authConfig.id, 1));

  // Actualizar cookie de sesión
  const sessionToken = await signToken(
    {
      sub: 'session',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      iat: Date.now(),
    },
    secret
  );
  setSessionCookie(c, sessionToken);

  return c.json({ ok: true, message: 'PIN maestro actualizado exitosamente.' });
});

// 9. POST /api/auth/update-questions — Actualiza las preguntas y respuestas secretas tras validar el PIN actual
authApp.post('/update-questions', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = updateQuestionsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Datos de preguntas inválidos.' }, 400);
  }

  const db = getDb(c);
  const secret = getPinSecret(c);
  const [auth] = await db.select().from(authConfig).where(eq(authConfig.id, 1)).all();
  if (!auth) {
    return c.json({ error: 'Configuración no encontrada.' }, 500);
  }

  // Verificar PIN actual para autorizar el cambio
  const currentHash = await sha256(parsed.data.currentPin, secret);
  if (!timingSafeEqual(currentHash, auth.pinHash)) {
    return c.json({ error: 'El PIN actual ingresado es incorrecto. No se autorizó el cambio.' }, 401);
  }

  const a1Hash = await sha256(parsed.data.a1, secret);
  const a2Hash = await sha256(parsed.data.a2, secret);
  const nowIso = new Date().toISOString();

  await db
    .update(authConfig)
    .set({
      q1: parsed.data.q1.trim(),
      a1Hash,
      q2: parsed.data.q2.trim(),
      a2Hash,
      updatedAt: nowIso,
    })
    .where(eq(authConfig.id, 1));

  return c.json({ ok: true, message: 'Preguntas y respuestas de seguridad actualizadas exitosamente.' });
});

export default authApp;

