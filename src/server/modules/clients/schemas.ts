import { z } from 'zod';
import { sanitizeString } from '../../middlewares/sanitize';

export const clientCreateSchema = z.object({
  name: z
    .string({ required_error: 'El nombre o empresa es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'El nombre o empresa es obligatorio')
    .refine((v) => v.length <= 200, 'El nombre no puede superar los 200 caracteres'),
  contactName: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 200, 'El nombre de contacto no puede superar los 200 caracteres')
    .optional()
    .nullable(),
  phone: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 50, 'El teléfono no puede superar los 50 caracteres')
    .optional()
    .nullable(),
  email: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 150, 'El email no puede superar los 150 caracteres')
    .pipe(z.string().email('Email inválido').or(z.literal('')))
    .optional()
    .nullable(),
  notes: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 2000, 'Las notas no pueden superar los 2000 caracteres')
    .optional()
    .nullable(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

// Alias para compatibilidad hacia atrás
export const clientSchema = clientCreateSchema;

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
