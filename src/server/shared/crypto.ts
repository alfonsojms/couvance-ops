// Primitivas criptográficas con Web Crypto: funcionan igual en Cloudflare (Edge) y en Node.

/** SHA-256 hex de `input.trim().toLowerCase() + secret` (PIN y respuestas secretas). */
export async function sha256(input: string, secret: string): Promise<string> {
  const normalized = input.trim().toLowerCase() + secret;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparación en tiempo constante para evitar ataques de temporización (timing attacks). */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.byteLength !== bBytes.byteLength) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < aBytes.byteLength; i++) {
    mismatch |= aBytes[i] ^ bBytes[i];
  }
  return mismatch === 0;
}
