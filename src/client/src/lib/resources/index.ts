// Un cliente HTTP por recurso: los componentes llaman a estas funciones, nunca a `api.*` directo.
export { authApi } from './auth';
export { backupApi } from './backup';
export { budgetsApi, milestonesApi } from './budgets';
export { clientsApi } from './clients';
export { financeApi } from './finance';
export { projectsApi } from './projects';
export { showcaseApi } from './showcase';
