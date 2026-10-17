import { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

const SESSION_COOKIE_NAME = 'couvance_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 días en segundos

export function getPinSecret(c: Context): string {
  const envSecret = (c.env as { PIN_SECRET?: string })?.PIN_SECRET;
  const processSecret = typeof process !== 'undefined' ? process.env?.PIN_SECRET : undefined;
  return envSecret || processSecret || 'couvance_ops_default_insecure_secret_change_in_prod';
}

// Generación y verificación de tokens HMAC-SHA256 nativos
async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface TokenPayload {
  sub: 'session' | 'reset';
  exp: number;
  iat: number;
}

const SESSION_TTL_MS = SESSION_MAX_AGE * 1000; // 30 días
const RESET_TTL_MS = 10 * 60 * 1000; // 10 minutos

/** Única forma de emitir tokens: `session` (30 días, cookie) o `reset` (10 minutos, recuperación de PIN). */
export function issueToken(sub: TokenPayload['sub'], secret: string): Promise<string> {
  const now = Date.now();
  return signToken({ sub, exp: now + (sub === 'session' ? SESSION_TTL_MS : RESET_TTL_MS), iat: now }, secret);
}

export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const key = await getHmacKey(secret);
  const payloadStr = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const payloadB64 = bufferToBase64Url(encoder.encode(payloadStr).buffer as ArrayBuffer);

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadB64)
  );
  const sigB64 = bufferToBase64Url(signature);
  return `${payloadB64}.${sigB64}`;
}

export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, sigB64] = parts;
    const key = await getHmacKey(secret);
    const encoder = new TextEncoder();

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBuffer(sigB64),
      encoder.encode(payloadB64)
    );

    if (!isValid) return null;

    const decoder = new TextDecoder();
    const payloadJson = decoder.decode(base64UrlToBuffer(payloadB64));
    const payload = JSON.parse(payloadJson) as TokenPayload;

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Helpers para cookies de sesión
export function setSessionCookie(c: Context, token: string): void {
  const isProd = typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : true;
  setCookie(c, SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax', // Requerido para soportar apertura desde WhatsApp en smartphones
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(c: Context): void {
  const isProd = typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : true;
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
  });
}

export function getSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE_NAME);
}

/** Token de la petición: la cookie de sesión o, si no hay, el header `Authorization: Bearer`. */
export function getRequestToken(c: Context): string | undefined {
  const cookieToken = getSessionCookie(c);
  if (cookieToken) return cookieToken;
  const authHeader = c.req.header('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
}

/** Una sesión es válida si el token está firmado con `secret`, no venció y es de tipo `session`. */
export async function isValidSessionToken(token: string, secret: string): Promise<boolean> {
  const payload = await verifyToken(token, secret);
  return Boolean(payload && payload.sub === 'session');
}

// Lista de rutas públicas exentas del middleware de autenticación
const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/auth/unlock' },
  { method: 'GET', path: '/api/auth/questions' },
  { method: 'POST', path: '/api/auth/recover' },
  { method: 'POST', path: '/api/auth/reset-pin' },
  { method: 'POST', path: '/api/auth/lock' },
  { method: 'GET', path: '/api/auth/status' },
  { method: 'GET', path: '/api/auth/me' },
  { method: 'GET', path: '/api/health' },
];

export async function pinAuthMiddleware(c: Context, next: Next) {
  const method = c.req.method.toUpperCase();
  if (method === 'OPTIONS') {
    return next();
  }

  // Normalizar ruta eliminando barras finales
  const rawPath = c.req.path;
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;

  // 1. Exención rigurosa de rutas públicas
  const isPublic = PUBLIC_ROUTES.some(
    (route) => route.method === method && route.path === path
  );
  if (isPublic) {
    return next();
  }

  // 2. Solo proteger endpoints bajo /api/
  if (!path.startsWith('/api/')) {
    return next();
  }

  // 3. Verificación de cookie de sesión o Bearer header
  const token = getRequestToken(c);
  if (!token) {
    return c.json({ error: 'No autenticado. Ingrese el PIN maestro.' }, 401);
  }

  if (!(await isValidSessionToken(token, getPinSecret(c)))) {
    clearSessionCookie(c);
    return c.json({ error: 'Sesión expirada o inválida. Ingrese el PIN de nuevo.' }, 401);
  }

  await next();
}

