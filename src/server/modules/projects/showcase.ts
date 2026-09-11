import { Hono } from 'hono';
import { eq, and, isNotNull, ne } from 'drizzle-orm';
import { getDb, projects, clients } from '../../db';

const showcaseApp = new Hono();

// GET /api/showcase — Portafolio de ventas optimizado (RN-07)
showcaseApp.get('/', async (c) => {
  const categoryFilter = c.req.query('category');
  const db = getDb(c);

  const showcaseProjects = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.status, 'COMPLETED'),
        eq(projects.productionStatus, 'ACTIVE'),
        isNotNull(projects.productionUrl),
        ne(projects.productionUrl, '')
      )
    )
    .all();

  const filtered = categoryFilter
    ? showcaseProjects.filter((p) => p.category.toUpperCase() === categoryFilter.toUpperCase())
    : showcaseProjects;

  const allClients = await db.select().from(clients).all();
  const clientsMap = new Map(allClients.map((cl) => [cl.id, cl]));

  const result = filtered.map((proj) => ({
    ...proj,
    clientName: clientsMap.get(proj.clientId)?.name || 'Cliente',
  }));

  return c.json(result);
});

export default showcaseApp;
