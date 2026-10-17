import { Hono, type Context } from 'hono';
import { getDb } from '../../db';
import { parseBody, requireId } from '../../shared/http';
import { createClientsRepository } from './repository';
import { clientSchema, clientUpdateSchema } from './schemas';
import { createClientsService } from './service';

const INVALID_CLIENT_ID = 'Identificador de cliente inválido o malformado.';

const serviceFor = (c: Context) => createClientsService(createClientsRepository(getDb(c)));

const clientsRoutes = new Hono();

// GET /api/clients — Listado de clientes con conteo de proyectos y saldos
clientsRoutes.get('/', async (c) => {
  return c.json(await serviceFor(c).listClients());
});

// POST /api/clients — Crea nuevo cliente
clientsRoutes.post('/', async (c) => {
  const input = await parseBody(c, clientSchema);
  return c.json(await serviceFor(c).createClient(input), 201);
});

// PUT /api/clients/:id — Actualiza cliente
clientsRoutes.put('/:id', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_CLIENT_ID);
  const input = await parseBody(c, clientUpdateSchema, 'Datos de cliente inválidos');
  return c.json(await serviceFor(c).updateClient(id, input));
});

// DELETE /api/clients/:id — Eliminación con protección 409 (RN-06)
clientsRoutes.delete('/:id', async (c) => {
  const id = requireId(c.req.param('id'), INVALID_CLIENT_ID);
  await serviceFor(c).deleteClient(id);
  return c.json({ ok: true, message: 'Cliente eliminado exitosamente.' });
});

export default clientsRoutes;
