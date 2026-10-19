/**
 * Error de negocio independiente del transporte. Los servicios lo lanzan sin conocer HTTP;
 * `handleHttpError` lo traduce a status: invalid → 400, unauthorized → 401, not_found → 404,
 * conflict → 409, internal → 500 (estado esperado del sistema, p. ej. sin configurar; responde sin stack).
 */
export type DomainErrorKind = 'invalid' | 'unauthorized' | 'not_found' | 'conflict' | 'internal';

export class DomainError extends Error {
  constructor(
    public readonly kind: DomainErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const invalid = (message: string) => new DomainError('invalid', message);
export const unauthorized = (message: string) => new DomainError('unauthorized', message);
export const notFound = (message: string) => new DomainError('not_found', message);
export const conflict = (message: string) => new DomainError('conflict', message);
export const internal = (message: string) => new DomainError('internal', message);
