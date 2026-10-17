import { Hono, type Context } from 'hono';
import { getDb } from '../../db';
import { clearSessionCookie, getPinSecret, getRequestToken, setSessionCookie } from '../../middlewares/auth';
import { clearFailedAttempts, getClientIp, rateLimitMiddleware, recordFailedAttempt } from '../../middlewares/rate-limit';
import { parseBody } from '../../shared/http';
import { createAuthRepository } from './repository';
import { changePinSchema, recoverSchema, resetPinSchema, unlockSchema, updateQuestionsSchema } from './schemas';
import { createAuthService } from './service';

/** Servicio de la petición: secreto y variables del runtime, e intentos fallidos ligados a la IP. */
function serviceFor(c: Context) {
  const ip = getClientIp(c);
  return createAuthService(createAuthRepository(getDb(c)), {
    secret: getPinSecret(c),
    env: c.env as Record<string, any>,
    attempts: { record: () => recordFailedAttempt(ip), clear: () => clearFailedAttempts(ip) },
  });
}

const authRoutes = new Hono();

// POST /api/auth/unlock — Valida el PIN de 8 dígitos y emite la cookie de sesión
authRoutes.post('/unlock', rateLimitMiddleware, async (c) => {
  const input = await parseBody(c, unlockSchema, 'El PIN debe tener 8 dígitos numéricos.');
  setSessionCookie(c, await serviceFor(c).unlock(input.pin));
  return c.json({ ok: true, message: 'Acceso autorizado.' });
});

// GET /api/auth/questions — Preguntas de seguridad públicas (sin respuestas ni hashes)
authRoutes.get('/questions', async (c) => {
  return c.json(await serviceFor(c).getQuestions());
});

// POST /api/auth/recover — Valida respuestas secretas y entrega un token temporal de 10 min
authRoutes.post('/recover', rateLimitMiddleware, async (c) => {
  const input = await parseBody(c, recoverSchema, 'Respuestas requeridas inválidas.');
  const resetToken = await serviceFor(c).recover(input);
  return c.json({ ok: true, resetToken, message: 'Respuestas correctas. Puede configurar un nuevo PIN.' });
});

// POST /api/auth/reset-pin — Valida el token temporal, actualiza el PIN y emite sesión
authRoutes.post('/reset-pin', async (c) => {
  const input = await parseBody(c, resetPinSchema, 'Datos de nuevo PIN inválidos.');
  setSessionCookie(c, await serviceFor(c).resetPin(input));
  return c.json({ ok: true, message: 'PIN actualizado exitosamente.' });
});

// POST /api/auth/lock — Cierra la sesión
authRoutes.post('/lock', (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true, message: 'Sesión cerrada.' });
});

// GET /api/auth/status y GET /api/auth/me — Verifica si hay una sesión activa
const authStatus = async (c: Context) => c.json({ authenticated: await serviceFor(c).isAuthenticated(getRequestToken(c)) });
authRoutes.get('/status', authStatus);
authRoutes.get('/me', authStatus);

// GET /api/auth/settings — Preguntas de seguridad actuales para la vista de configuración
authRoutes.get('/settings', async (c) => {
  return c.json(await serviceFor(c).getSettings());
});

// POST /api/auth/change-pin — Cambia el PIN maestro tras validar el PIN actual
authRoutes.post('/change-pin', async (c) => {
  const input = await parseBody(c, changePinSchema, 'Datos de PIN inválidos.');
  setSessionCookie(c, await serviceFor(c).changePin(input));
  return c.json({ ok: true, message: 'PIN maestro actualizado exitosamente.' });
});

// POST /api/auth/update-questions — Actualiza preguntas y respuestas secretas tras validar el PIN actual
authRoutes.post('/update-questions', async (c) => {
  const input = await parseBody(c, updateQuestionsSchema, 'Datos de preguntas inválidos.');
  await serviceFor(c).updateQuestions(input);
  return c.json({ ok: true, message: 'Preguntas y respuestas de seguridad actualizadas exitosamente.' });
});

export default authRoutes;
