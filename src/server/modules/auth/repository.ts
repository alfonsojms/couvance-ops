import { eq } from 'drizzle-orm';
import { authConfig, seedInitialAuthIfNeeded, type AppDatabase } from '../../db';

export type AuthConfigRow = typeof authConfig.$inferSelect;

/** Fila única (id = 1) de `auth_config`: hash del PIN y preguntas/respuestas de seguridad. */
const AUTH_CONFIG_ID = 1;

/** Acceso a `auth_config`. Nunca expone esta fila fuera del módulo de autenticación (RN-10). */
export function createAuthRepository(db: AppDatabase) {
  const findConfig = async (): Promise<AuthConfigRow | undefined> =>
    (await db.select().from(authConfig).where(eq(authConfig.id, AUTH_CONFIG_ID)).all())[0];

  return {
    findConfig,

    /** Lee la configuración y, si la BD está recién migrada (p. ej. D1 en frío), la siembra antes. */
    async findOrSeedConfig(secret: string, env?: Record<string, any>): Promise<AuthConfigRow | undefined> {
      const existing = await findConfig();
      if (existing) return existing;
      await seedInitialAuthIfNeeded(db, secret, env);
      return findConfig();
    },

    async updatePinHash(pinHash: string, nowIso: string): Promise<void> {
      await db.update(authConfig).set({ pinHash, updatedAt: nowIso }).where(eq(authConfig.id, AUTH_CONFIG_ID));
    },

    async updateQuestions(
      fields: Pick<AuthConfigRow, 'q1' | 'a1Hash' | 'q2' | 'a2Hash'>,
      nowIso: string
    ): Promise<void> {
      await db.update(authConfig).set({ ...fields, updatedAt: nowIso }).where(eq(authConfig.id, AUTH_CONFIG_ID));
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
