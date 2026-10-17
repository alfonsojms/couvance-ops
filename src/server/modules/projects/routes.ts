import { Hono, type Context } from 'hono';
import { getDb } from '../../db';
import { parseBody, requireId } from '../../shared/http';
import { createProjectsRepository } from './repository';
import { parseProjectStatusFilter, projectCreateSchema, projectSoftEditSchema, projectUpdateSchema } from './schemas';
import { createProjectsService } from './service';

const INVALID_PROJECT_ID = 'Identificador de proyecto inválido o malformado.';

export const projectsServiceFor = (c: Context) => createProjectsService(createProjectsRepository(getDb(c)));

/**
 * RN-08: registra la renovación y arma la respuesta. Única implementación, compartida por
 * POST /api/projects/:id/renew y los alias de /api/finance.
 */
export async function renewProjectResponse(c: Context, projectId: string) {
  const nextRenewalDate = await projectsServiceFor(c).renewProject(projectId);
  return c.json({
    ok: true,
    message: `Renovación registrada exitosamente. Próxima fecha: ${nextRenewalDate}`,
    nextRenewalDate,
  });
}

const projectsRoutes = new Hono();

// GET /api/projects — Listado general con cliente y totales, filtrable por ?status=
projectsRoutes.get('/', async (c) => {
  return c.json(await projectsServiceFor(c).listProjects(parseProjectStatusFilter(c.req.query('status'))));
});

// GET /api/projects/:id — Detalle completo del proyecto con cliente, presupuestos e hitos
projectsRoutes.get('/:id', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_PROJECT_ID);
  return c.json(await projectsServiceFor(c).getProject(id));
});

// POST /api/projects — Crea proyecto
projectsRoutes.post('/', async (c) => {
  const input = await parseBody(c, projectCreateSchema);
  return c.json(await projectsServiceFor(c).createProject(input), 201);
});

// PUT /api/projects/:id — Actualización y cancelación no destructiva (RN-05)
projectsRoutes.put('/:id', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_PROJECT_ID);
  const input = await parseBody(c, projectUpdateSchema);
  return c.json(await projectsServiceFor(c).updateProject(id, input));
});

// PATCH /api/projects/:id — Soft edit de metadatos (RN-07, RN-08)
projectsRoutes.patch('/:id', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_PROJECT_ID);
  const input = await parseBody(c, projectSoftEditSchema);
  return c.json(await projectsServiceFor(c).softEditProject(id, input));
});

// POST /api/projects/:id/renew — Suma un período de renovación (+1 mes o +1 año) (RN-08)
projectsRoutes.post('/:id/renew', async (c) => {
  return renewProjectResponse(c, requireId(c.req.param('id'), INVALID_PROJECT_ID));
});

export default projectsRoutes;
