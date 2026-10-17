import { Hono } from 'hono';
import { projectsServiceFor } from './routes';
import { parseProjectCategoryFilter } from './schemas';

const showcaseApp = new Hono();

// GET /api/showcase — Portafolio de ventas optimizado (RN-07), filtrable por ?category=
showcaseApp.get('/', async (c) => {
  return c.json(await projectsServiceFor(c).listShowcase(parseProjectCategoryFilter(c.req.query('category'))));
});

export default showcaseApp;
