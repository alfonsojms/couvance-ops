import { Hono } from 'hono';
import { getDb, clients, projects, budgets, milestones } from '../../db';

const backupApp = new Hono();

// GET /api/backup/export — Exportación estructurada JSON (excluye estrictamente AUTH_CONFIG) (RN-10)
backupApp.get('/export', async (c) => {
  const db = getDb(c);

  const allClients = await db.select().from(clients).all();
  const allProjects = await db.select().from(projects).all();
  const allBudgets = await db.select().from(budgets).all();
  const allMilestones = await db.select().from(milestones).all();

  const backupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      clients: allClients,
      projects: allProjects,
      budgets: allBudgets,
      milestones: allMilestones,
    },
  };

  const filenameDate = new Date().toISOString().split('T')[0];
  c.header('Content-Disposition', `attachment; filename="kodex-ops-backup-${filenameDate}.json"`);
  return c.body(JSON.stringify(backupData, null, 2), 200, {
    'Content-Type': 'application/json',
  });
});

export default backupApp;
