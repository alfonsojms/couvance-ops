// Reglas de negocio puras de clientes: sin Hono, sin Drizzle, sin reloj ni IDs propios.

export interface ClientInput {
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface ClientChanges {
  updatedAt: string;
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

/** Edición parcial: solo se tocan los campos enviados; un texto vacío se guarda como null. */
export function buildClientUpdate(data: ClientInput, nowIso: string): ClientChanges {
  const updateData: ClientChanges = { updatedAt: nowIso };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  return updateData;
}

/** RN-06: un cliente con proyectos no se borra. Devuelve el motivo, o null si se puede borrar. */
export function clientDeletionBlocker(projectCount: number): string | null {
  if (projectCount === 0) return null;
  return `No es posible eliminar el cliente porque posee ${projectCount} proyecto(s) asociado(s). Para preservar el histórico contable y de cotizaciones, mantenga el cliente en el sistema.`;
}
