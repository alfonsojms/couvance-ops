// Módulo de autenticación por PIN, organizado por capas:
// schemas (Zod) → repository (auth_config) → service (casos de uso) → routes (HTTP, cookies y rate limit).
export { default } from './routes';
export * from './schemas';
