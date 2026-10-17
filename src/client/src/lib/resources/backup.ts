export const backupApi = {
  /** Descarga el respaldo JSON como archivo; usa `fetch` directo porque la respuesta es un adjunto. */
  exportFile: async (): Promise<Blob> => {
    const res = await fetch('/api/backup/export', { credentials: 'include' });
    if (!res.ok) throw new Error('Error al generar respaldo');
    return res.blob();
  },
};
