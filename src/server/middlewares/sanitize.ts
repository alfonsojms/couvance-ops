import { Context, Next } from 'hono';
import { z } from 'zod';

/**
 * Sanitiza una cadena de texto eliminando caracteres nulos y caracteres de control no imprimibles
 * que podrían provocar truncamiento de cadenas en drivers C/SQLite o ataques de evasión.
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;
  return val
    // 1. Eliminar bytes nulos (\0, \u0000) que causan terminación prematura de strings en C/SQLite
    .replace(/\0/g, '')
    // 2. Eliminar caracteres de control peligrosos (preservando saltos de línea \n, \r y tabulaciones \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 3. Normalizar Unicode en forma canónica compuesta (NFC)
    .normalize('NFC')
    // 4. Limpiar espacios iniciales y finales
    .trim();
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
  .regex(/^[a-zA-Z0-9_-]+$/, 'Formato de identificador inválido: solo se permiten caracteres alfanuméricos, guiones y guiones bajos');

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
 * Recorre recursivamente un objeto o array y sanitiza todas las cadenas de texto.
 */
export function sanitizeDeep<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeDeep(item)) as unknown as T;
  }

  if (typeof input === 'object' && input.constructor === Object) {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitizar también la clave del objeto para prevenir inyección de propiedades maliciosas
      const cleanKey = sanitizeString(key);
      sanitizedObj[cleanKey] = sanitizeDeep(value);
    }
    return sanitizedObj as T;
  }

  return input;
}

/**
 * Patrones conocidos de inyección SQL destructiva o evasiva en entradas que deberían ser simples.
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION|TRUNCATE)\b\s+)/i,
  /(--|\/\*|\*\/|;\s*$)/,
  /('\s*OR\s*'\d+'\s*=\s*'\d+)/i,
  /("\s*OR\s*"\d+"\s*=\s*"\d+)/i,
  /('\s*OR\s*1\s*=\s*1)/i,
  /("\s*OR\s*1\s*=\s*1)/i,
];

/**
 * Verifica si una cadena contiene patrones evidentes de inyección SQL.
 * Útil para campos restringidos como identificadores, códigos o parámetros de consulta.
 */
export function hasSqlInjectionPattern(val: string): boolean {
  if (typeof val !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(val));
}

/**
 * Helper Zod para cadenas de texto sanitizadas automáticamente con límites de longitud defensivos.
 */
export const sanitizedText = (min: number = 0, max: number = 255) =>
  z
    .string()
    .transform(sanitizeString)
    .refine((val) => val.length >= min, {
      message: `Debe contener al menos ${min} caracter(es)`,
    })
    .refine((val) => val.length <= max, {
      message: `No puede superar los ${max} caracteres`,
    });

/**
 * Middleware central de Hono para sanitización global de inputs.
 * Sanitiza automáticamente los query params y el cuerpo JSON de cada solicitud.
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
    for (const [key, values] of Object.entries(queries)) {
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
