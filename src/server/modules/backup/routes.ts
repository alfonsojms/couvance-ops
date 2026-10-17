import { Hono } from 'hono';
import { getDb } from '../../db';
import { createBackupRepository } from './repository';
import { createBackupService } from './service';

const backupRoutes = new Hono();

// GET /api/backup/export — Exportación estructurada JSON como descarga (excluye estrictamente AUTH_CONFIG) (RN-10)
backupRoutes.get('/export', async (c) => {
  const { filenameDate, backup } = await createBackupService(createBackupRepository(getDb(c))).exportBackup();
  c.header('Content-Disposition', `attachment; filename="couvance-ops-backup-${filenameDate}.json"`);
  return c.body(JSON.stringify(backup, null, 2), 200, {
    'Content-Type': 'application/json',
  });
});

export default backupRoutes;
