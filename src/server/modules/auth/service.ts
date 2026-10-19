import { issueToken, isValidSessionToken, verifyToken } from '../../middlewares/auth';
import { systemClock, type ServiceClock } from '../../shared/clock';
import { sha256, timingSafeEqual } from '../../shared/crypto';
import { internal, notFound, unauthorized } from '../../shared/errors';
import type { AuthConfigRow, AuthRepository } from './repository';
import type { ChangePinInput, RecoverInput, ResetPinInput, UpdateQuestionsInput } from './schemas';

/** Registro de intentos fallidos del rate limit, ya ligado a la IP de la petición. */
export interface FailedAttempts {
  record: () => void;
  clear: () => void;
}

export interface AuthContext {
  /** Secreto de firma y de hash (`PIN_SECRET`). */
  secret: string;
  /** Variables del runtime para sembrar credenciales iniciales (INITIAL_PIN, SECURITY_*). */
  env?: Record<string, unknown>;
  attempts?: FailedAttempts;
}

const noAttempts: FailedAttempts = { record: () => {}, clear: () => {} };

/** Casos de uso de autenticación por PIN. No conoce HTTP ni cookies: devuelve tokens y lanza DomainError. */
export function createAuthService(repo: AuthRepository, ctx: AuthContext, clock: ServiceClock = systemClock) {
  const { secret } = ctx;
  const attempts = ctx.attempts ?? noAttempts;

  const matches = async (plain: string, hash: string) => timingSafeEqual(await sha256(plain, secret), hash);

  /** Configuración obligatoria para operar; si falta, el sistema no está configurado (500). */
  async function requireConfig(message: string): Promise<AuthConfigRow> {
    const config = await repo.findConfig();
    if (!config) throw internal(message);
    return config;
  }

  return {
    /** Valida el PIN; devuelve un token de sesión. Cuenta el intento fallido para el rate limit. */
    async unlock(pin: string): Promise<string> {
      const config = await repo.findOrSeedConfig(secret, ctx.env);
      if (!config) throw internal('Sistema no configurado o credenciales no sembradas.');

      if (!(await matches(pin, config.pinHash))) {
        attempts.record();
        throw unauthorized('PIN incorrecto. Intente nuevamente.');
      }

      attempts.clear();
      return issueToken('session', secret);
    },

    /** Preguntas de seguridad públicas (sin respuestas ni hashes). */
    async getQuestions(): Promise<{ q1: string; q2: string }> {
      const config = await repo.findOrSeedConfig(secret, ctx.env);
      if (!config) throw notFound('No se encontraron preguntas de seguridad configuradas.');
      return { q1: config.q1, q2: config.q2 };
    },

    /** Valida las dos respuestas secretas; devuelve un token de recuperación de 10 minutos. */
    async recover(input: RecoverInput): Promise<string> {
      const config = await requireConfig('Sistema no configurado.');

      const match1 = await matches(input.a1, config.a1Hash);
      const match2 = await matches(input.a2, config.a2Hash);
      if (!match1 || !match2) {
        attempts.record();
        throw unauthorized('Una o ambas respuestas son incorrectas.');
      }

      attempts.clear();
      return issueToken('reset', secret);
    },

    /** Cambia el PIN con un token de recuperación válido; devuelve una sesión nueva. */
    async resetPin(input: ResetPinInput): Promise<string> {
      const payload = await verifyToken(input.token, secret);
      if (!payload || payload.sub !== 'reset') throw unauthorized('Token de recuperación inválido o vencido.');

      await repo.updatePinHash(await sha256(input.newPin, secret), clock.now());
      return issueToken('session', secret);
    },

    async isAuthenticated(token: string | undefined): Promise<boolean> {
      return token ? isValidSessionToken(token, secret) : false;
    },

    async getSettings(): Promise<{ q1: string; q2: string; updatedAt: string }> {
      const config = await repo.findConfig();
      if (!config) throw notFound('Configuración no encontrada.');
      return { q1: config.q1, q2: config.q2, updatedAt: config.updatedAt };
    },

    /** Cambia el PIN tras validar el actual; devuelve una sesión nueva. */
    async changePin(input: ChangePinInput): Promise<string> {
      const config = await requireConfig('Configuración no encontrada.');
      if (!(await matches(input.currentPin, config.pinHash))) {
        throw unauthorized('El PIN actual ingresado es incorrecto.');
      }

      await repo.updatePinHash(await sha256(input.newPin, secret), clock.now());
      return issueToken('session', secret);
    },

    /** Reemplaza preguntas y respuestas secretas tras validar el PIN actual. */
    async updateQuestions(input: UpdateQuestionsInput): Promise<void> {
      const config = await requireConfig('Configuración no encontrada.');
      if (!(await matches(input.currentPin, config.pinHash))) {
        throw unauthorized('El PIN actual ingresado es incorrecto. No se autorizó el cambio.');
      }

      await repo.updateQuestions(
        {
          q1: input.q1.trim(),
          a1Hash: await sha256(input.a1, secret),
          q2: input.q2.trim(),
          a2Hash: await sha256(input.a2, secret),
        },
        clock.now(),
      );
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
