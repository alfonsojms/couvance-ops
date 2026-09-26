import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { pinAuthMiddleware } from './middlewares/auth';
import { sanitizeMiddleware } from './middlewares/sanitize';
import authApp from './modules/auth';
import clientsApp from './modules/clients';
import projectsApp from './modules/projects';
import showcaseApp from './modules/projects/showcase';
import budgetsApp from './modules/budgets';
import financeApp from './modules/finance';
import backupApp from './modules/backup';

import { getGlobalDb } from './db';

export type AppEnv = {
  Bindings: {
    DB?: D1Database;
    PIN_SECRET?: string;
  };
  Variables: {
    db?: any;
  };
};

const app = new Hono<AppEnv>();

// Inyección de la instancia de base de datos en Node.js si está inicializada
app.use('*', async (c, next) => {
  const gDb = getGlobalDb();
  if (gDb && !c.get('db')) {
    c.set('db', gDb);
  }
  await next();
});

// Middleware global de sanitización contra inyecciones SQL y bytes nulos
app.use('*', sanitizeMiddleware);

// Middleware CORS para desarrollo
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
  })
);

// Middleware central de autenticación PIN (excluye automáticamente rutas públicas)
app.use('/api/*', pinAuthMiddleware);

// Rutas de Módulos
app.route('/api/auth', authApp);
app.route('/api/clients', clientsApp);
app.route('/api/projects', projectsApp);
app.route('/api/showcase', showcaseApp);
app.route('/api', budgetsApp);
app.route('/api/finance', financeApp);
app.route('/api/backup', backupApp);

// Endpoint de diagnóstico y salud del sistema
app.get('/api/health', (c) => {
  const isCloudflare = Boolean((c.env as { DB?: unknown })?.DB);
  return c.json({
    status: 'ok',
    runtime: isCloudflare ? 'cloudflare' : 'node',
    uptime: typeof process !== 'undefined' ? process.uptime() : 0,
    timestamp: new Date().toISOString(),
  });
});

// Manejador central de rutas no encontradas (404 Not Found)
app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json(
      {
        error: 'Not Found',
        message: `El endpoint '${c.req.method} ${c.req.path}' no existe en la API de Couvance Ops.`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
  return c.text('404 Not Found', 404);
});

// Manejador central de errores para diagnóstico y observabilidad
app.onError((err, c) => {
  console.error(`🔥 [API Error] ${c.req.method} ${c.req.url}:`, err);
  return c.json(
    {
      error: err.message || 'Internal Server Error',
      stack: typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' ? err.stack : undefined,
    },
    500
  );
});

export default app;
