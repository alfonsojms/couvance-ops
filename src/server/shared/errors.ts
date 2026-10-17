/**
 * Error de negocio independiente del transporte. Los servicios lo lanzan sin conocer HTTP;
 * `handleHttpError` lo traduce a status: invalid → 400, not_found → 404, conflict → 409.
 */
export type DomainErrorKind = 'invalid' | 'not_found' | 'conflict';

export class DomainError extends Error {
  constructor(
    public readonly kind: DomainErrorKind,
    message: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const invalid = (message: string) => new DomainError('invalid', message);
export const notFound = (message: string) => new DomainError('not_found', message);
export const conflict = (message: string) => new DomainError('conflict', message);
