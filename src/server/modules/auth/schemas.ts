import { z } from 'zod';
import { sanitizeString } from '../../middlewares/sanitize';

// Esquemas Zod cacheados fuera de los handlers
export const unlockSchema = z.object({
  pin: z
    .string({ required_error: 'El PIN es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El PIN debe tener exactamente 8 dígitos numéricos'),
});

export const recoverSchema = z.object({
  a1: z
    .string({ required_error: 'La respuesta 1 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'La respuesta 1 no puede estar vacía')
    .refine((v) => v.length <= 200, 'La respuesta no puede superar 200 caracteres'),
  a2: z
    .string({ required_error: 'La respuesta 2 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'La respuesta 2 no puede estar vacía')
    .refine((v) => v.length <= 200, 'La respuesta no puede superar 200 caracteres'),
});

export const resetPinSchema = z.object({
  token: z
    .string({ required_error: 'El token de recuperación es requerido' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'El token de recuperación no puede estar vacío')
    .refine((v) => v.length <= 1000, 'Token inválido'),
  newPin: z
    .string({ required_error: 'El nuevo PIN es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El nuevo PIN debe tener exactamente 8 dígitos numéricos'),
});

export const changePinSchema = z.object({
  currentPin: z
    .string({ required_error: 'El PIN actual es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El PIN actual debe tener exactamente 8 dígitos numéricos'),
  newPin: z
    .string({ required_error: 'El nuevo PIN es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El nuevo PIN debe tener exactamente 8 dígitos numéricos'),
});

export const updateQuestionsSchema = z.object({
  currentPin: z
    .string({ required_error: 'El PIN actual es requerido para autorizar el cambio' })
    .transform(sanitizeString)
    .refine((v) => /^\d{8}$/.test(v), 'El PIN actual debe tener exactamente 8 dígitos numéricos'),
  q1: z
    .string({ required_error: 'La pregunta 1 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 3, 'La pregunta 1 debe tener al menos 3 caracteres')
    .refine((v) => v.length <= 200, 'La pregunta 1 no puede superar 200 caracteres'),
  a1: z
    .string({ required_error: 'La respuesta 1 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'La respuesta 1 no puede estar vacía')
    .refine((v) => v.length <= 200, 'La respuesta 1 no puede superar 200 caracteres'),
  q2: z
    .string({ required_error: 'La pregunta 2 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 3, 'La pregunta 2 debe tener al menos 3 caracteres')
    .refine((v) => v.length <= 200, 'La pregunta 2 no puede superar 200 caracteres'),
  a2: z
    .string({ required_error: 'La respuesta 2 es obligatoria' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'La respuesta 2 no puede estar vacía')
    .refine((v) => v.length <= 200, 'La respuesta 2 no puede superar 200 caracteres'),
});

export type UnlockInput = z.infer<typeof unlockSchema>;
export type RecoverInput = z.infer<typeof recoverSchema>;
export type ResetPinInput = z.infer<typeof resetPinSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
export type UpdateQuestionsInput = z.infer<typeof updateQuestionsSchema>;
