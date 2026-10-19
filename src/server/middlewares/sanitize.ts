import { Context, Next } from 'hono';
import { z } from 'zod';

/**
 * Sanitiza una cadena de texto eliminando caracteres nulos y caracteres de control no imprimibles
 * que podrían provocar truncamiento de cadenas en drivers C/SQLite o ataques de evasión.
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;
  return (
    val
      // 1. Eliminar bytes nulos (\0, \u0000) que causan terminación prematura de strings en C/SQLite
      .replace(/\0/g, '')
      // 2. Eliminar caracteres de control peligrosos (preservando saltos de línea \n, \r y tabulaciones \t)
      // eslint-disable-next-line no-control-regex -- los caracteres de control son justo lo que se elimina
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 3. Normalizar Unicode en forma canónica compuesta (NFC)
      .normalize('NFC')
      // 4. Limpiar espacios iniciales y finales
      .trim()
  );
}

/**
 * Esquema estricto para identificadores (UUID / CUID / Alfanumérico).
 * Impide cualquier intento de inyectar comillas, puntos y coma, comentarios o operadores SQL en parámetros de ruta.
 */
export const idParamSchema = z
  .string({ required_error: 'El identificador es obligatorio' })
  .trim()
  .min(1, 'El identificador no puede estar vacío')
  .max(64, 'El identificador supera la longitud máxima permitida')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Formato de identificador inválido: solo se permiten caracteres alfanuméricos, guiones y guiones bajos',
  );

/**
 * Helper para validar y sanitizar parámetros de ruta (ej: :id, :projectId).
 * Retorna el ID validado o null si es inválido.
 */
export function validateAndSanitizeId(rawId: string | undefined): string | null {
  if (!rawId) return null;
  const cleaned = sanitizeString(rawId);
  const result = idParamSchema.safeParse(cleaned);
  return result.success ? result.data : null;
}

/**
 * Middleware global: rechaza con 400 cualquier byte nulo en la URL o en los query params.
 * No modifica el body; los textos del body se limpian con `sanitizeString` dentro de cada esquema Zod.
 */
export async function sanitizeMiddleware(c: Context, next: Next) {
  // 1. Validar y rechazar caracteres nulos inmediatos en la URL y Query String
  const url = c.req.url;
  if (url.includes('\0') || url.includes('%00')) {
    return c.json({ error: 'Solicitud rechazada: intento de inyección de byte nulo detectado.' }, 400);
  }

  // 2. Sanitizar parámetros de consulta
  const queries = c.req.queries();
  if (queries) {
    for (const values of Object.values(queries)) {
      if (values) {
        for (const v of values) {
          if (typeof v === 'string' && (v.includes('\0') || v.includes('%00'))) {
            return c.json({ error: 'Parámetro de consulta inválido: byte nulo detectado.' }, 400);
          }
        }
      }
    }
  }

  await next();
}
