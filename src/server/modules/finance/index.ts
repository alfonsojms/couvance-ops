// Módulo de finanzas (radar, historial, métricas), organizado por capas:
// domain (reglas puras) → repository (Drizzle) → service (casos de uso) → routes (HTTP).
export { default } from './routes';
export { getDaysUntil } from './domain';
