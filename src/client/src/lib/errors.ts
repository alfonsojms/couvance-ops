// Mensaje legible de un error capturado (`catch (err)` es `unknown`): el del Error si lo trae, si no el fallback.
// Vive fuera de lib/api.ts para que los tests de UI puedan seguir mockeando ese módulo con solo `{ api }`.
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
