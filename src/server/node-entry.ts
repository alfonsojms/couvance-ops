import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import app from './app';
import * as schema from './db/schema';

// Helper nativo para hash de sembrado
const hashValue = (val: string) =>
  crypto
    .createHash('sha256')
    .update(val.trim().toLowerCase() + (process.env.PIN_SECRET || 'kodex_ops_default_insecure_secret_change_in_prod'))
    .digest('hex');

// 1. Inicialización y conexión de SQLite local (better-sqlite3)
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/kodex-ops.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

// Inyección de la base de datos en el contexto de Hono
app.use('*', async (c, next) => {
  c.set('db', db);
  await next();
});

// 2. Ejecución automática de migraciones Drizzle en el arranque
try {
  const migrationsFolder = './drizzle';
  if (fs.existsSync(migrationsFolder) && fs.readdirSync(migrationsFolder).some((f) => f.endsWith('.sql'))) {
    console.log('🔄 Ejecutando migraciones Drizzle en SQLite local...');
    migrate(db, { migrationsFolder });
    console.log('✅ Migraciones Drizzle aplicadas exitosamente.');
  } else {
    console.log('ℹ️ Carpeta de migraciones vacía o pendiente. Asegúrese de generar migraciones con drizzle-kit.');
  }

  // Sembrado inicial (seed) si la tabla AUTH_CONFIG está vacía
  const existingAuth = db.select().from(schema.authConfig).where(eq(schema.authConfig.id, 1)).get();
  if (!existingAuth) {
    const initialPin = process.env.INITIAL_PIN || '123456';
    const q1 = process.env.SECURITY_Q1 || '¿Cuál es el nombre de tu primera mascota?';
    const a1 = process.env.SECURITY_A1 || 'kodex';
    const q2 = process.env.SECURITY_Q2 || '¿En qué ciudad se fundó la agencia?';
    const a2 = process.env.SECURITY_A2 || 'valencia';

    db.insert(schema.authConfig)
      .values({
        id: 1,
        pinHash: hashValue(initialPin),
        q1,
        a1Hash: hashValue(a1),
        q2,
        a2Hash: hashValue(a2),
        updatedAt: new Date().toISOString(),
      })
      .run();
    console.log('🌱 Credenciales maestras iniciales sembradas en AUTH_CONFIG.');
  }
} catch (error) {
  console.error('⚠️ Advertencia o error durante migraciones o sembrado:', error);
}

// 3. Servicio de assets estáticos compilados de React (SPA)
if (fs.existsSync('./dist/client')) {
  app.use('/*', serveStatic({ root: './dist/client' }));
  app.get('*', serveStatic({ path: './dist/client/index.html' }));
}

// 4. Arranque del servidor con @hono/node-server
const port = Number(process.env.PORT) || 3000;
console.log(`🚀 Servidor Kodex Ops escuchando en http://0.0.0.0:${port}`);
serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});
