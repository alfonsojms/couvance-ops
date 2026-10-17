import { describe, it, expect } from 'vitest';
import app from '../src/server/app';

// La SPA y la API se sirven siempre desde el mismo origen (Cloudflare Pages, Docker y proxy de Vite),
// por lo que la API no debe autorizar peticiones con credenciales desde orígenes externos.
describe('Seguridad: CORS', () => {
  const evilOrigin = 'https://evil.example';

  it('no refleja un origen externo ni permite credenciales en peticiones simples', async () => {
    const res = await app.request('/api/health', { headers: { Origin: evilOrigin } });

    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(res.headers.get('access-control-allow-credentials')).toBeNull();
  });

  it('no autoriza preflight desde un origen externo', async () => {
    const res = await app.request('/api/clients', {
      method: 'OPTIONS',
      headers: {
        Origin: evilOrigin,
        'Access-Control-Request-Method': 'DELETE',
      },
    });

    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    expect(res.headers.get('access-control-allow-methods')).toBeNull();
  });

  it('las peticiones del mismo origen siguen funcionando', async () => {
    const res = await app.request('/api/health');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
