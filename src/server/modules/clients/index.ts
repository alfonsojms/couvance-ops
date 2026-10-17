// Módulo de clientes, organizado por capas:
// domain (reglas puras) → schemas (Zod) → repository (Drizzle) → service (casos de uso) → routes (HTTP).
export { default } from './routes';
export * from './schemas';
