import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type D1Db = ReturnType<typeof drizzle<typeof schema>>;

export function createD1Db(d1: D1Database): D1Db {
  return drizzle(d1, { schema });
}
