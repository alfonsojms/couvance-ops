import { Hono } from 'hono';
import { eq, and, isNotNull, ne } from 'drizzle-orm';
import { getDb, projects, clients } from '../../db';
import { sanitizeString } from '../../middlewares/sanitize';
import { projectCategorySchema } from './index';

const showcaseApp = new Hono();

// GET /api/showcase — Portafolio de ventas optimizado (RN-07)
showcaseApp.get('/', async (c) => {
  const rawCategory = c.req.query('category');
  const cleanCategory = rawCategory ? sanitizeString(rawCategory).toUpperCase() : null;
  const categoryParsed = cleanCategory ? projectCategorySchema.safeParse(cleanCategory) : null;
  const categoryFilter = categoryParsed?.success ? categoryParsed.data : null;
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
    );

  const validProjects = showcaseProjects.filter(
    (p) => Boolean(p.productionUrl && p.productionUrl.trim().length > 0)
  );

  const filtered = categoryFilter
    ? validProjects.filter((p) => p.category === categoryFilter)
    : validProjects;

  const allClients = await db.select().from(clients).all();
  const clientsMap = new Map(allClients.map((cl) => [cl.id, cl]));

  const result = filtered.map((proj) => ({
    ...proj,
    clientName: clientsMap.get(proj.clientId)?.name || 'Cliente',
  }));

  return c.json(result);
});

export default showcaseApp;
