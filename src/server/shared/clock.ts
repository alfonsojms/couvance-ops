/** Reloj e IDs inyectables en los servicios, para que los tests puedan fijarlos. */
export interface ServiceClock {
  now: () => string;
  newId: () => string;
}

export const systemClock: ServiceClock = {
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
};
