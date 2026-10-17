// Módulo de proyectos y showcase, organizado por capas:
// domain (reglas puras) → schemas (Zod) → repository (Drizzle) → service (casos de uso) → routes (HTTP).
export { default, renewProjectResponse } from './routes';
export { buildProjectUpdate, calculateNextRenewalDate, computeProjectTotals } from './domain';
export * from './schemas';
