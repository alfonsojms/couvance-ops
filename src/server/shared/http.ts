import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';
import { validateAndSanitizeId } from '../middlewares/sanitize';
import { DomainError, type DomainErrorKind } from './errors';

const DOMAIN_ERROR_STATUS: Record<DomainErrorKind, ContentfulStatusCode> = {
  invalid: 400,
  unauthorized: 401,
  not_found: 404,
  conflict: 409,
  internal: 500,
};

/**
 * Error HTTP esperado (validación, recurso inexistente, conflicto de negocio).
 * Se lanza desde handlers o servicios y `app.onError` lo traduce a `{ error: message }` con su status,
 * que es el contrato de errores que consume la SPA (`lib/api.ts` lee `json.error`).
 */
export class HttpError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Traduce un HttpError o DomainError a su respuesta JSON `{ error }`; devuelve null para cualquier otro error. */
export function handleHttpError(err: Error, c: Context): Response | null {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof DomainError) {
    return c.json({ error: err.message }, DOMAIN_ERROR_STATUS[err.kind]);
  }
  return null;
}

/** Valida y sanitiza un parámetro de ruta; lanza 400 con `message` si es inválido. */
export function requireId(rawId: string | undefined, message: string): string {
  const id = validateAndSanitizeId(rawId);
  if (!id) {
    throw new HttpError(400, message);
  }
  return id;
}

/**
 * Lee el body JSON y lo valida con `schema`. Un body ausente o que no es JSON se valida como `null`.
 * Lanza 400 con el primer mensaje de Zod (o `fallbackMessage` si Zod no aporta ninguno).
 */
export async function parseBody<S extends z.ZodTypeAny>(
  c: Context,
  schema: S,
  fallbackMessage = 'Datos inválidos.',
): Promise<z.output<S>> {
  const body = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message || fallbackMessage);
  }
  return parsed.data;
}
