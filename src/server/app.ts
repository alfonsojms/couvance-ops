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

export default app;
