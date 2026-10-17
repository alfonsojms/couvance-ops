import { systemClock, type ServiceClock } from '../../shared/clock';
import type { BackupRepository } from './repository';

/** Exportación de respaldo: solo datos de negocio, nunca credenciales ni hashes (RN-10). */
export function createBackupService(repo: BackupRepository, clock: ServiceClock = systemClock) {
  return {
    async exportBackup() {
      const exportedAt = clock.now();
      return {
        filenameDate: exportedAt.split('T')[0],
        backup: { version: '1.0', exportedAt, data: await repo.loadBusinessData() },
      };
    },
  };
}
