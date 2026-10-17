import { z } from 'zod';
import { sanitizeString } from '../../middlewares/sanitize';

// Esquema de creación de hito
export const milestoneInputSchema = z.object({
  title: z
    .string({ required_error: 'El título del hito es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'El título del hito es obligatorio')
    .refine((v) => v.length <= 200, 'El título no puede superar los 200 caracteres'),
  percentage: z
    .number({ required_error: 'El porcentaje es obligatorio' })
    .int('El porcentaje debe ser un número entero')
    .min(1, 'El porcentaje debe ser al menos 1')
    .max(100, 'El porcentaje no puede superar 100'),
  dueDate: z
    .string()
    .transform(sanitizeString)
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD').or(z.literal('')))
    .optional()
    .nullable(),
});

// Esquema de creación y edición de presupuesto (RN-01 & RN-02)
export const budgetCreateSchema = z
  .object({
    title: z
      .string({ required_error: 'El concepto o título del presupuesto es obligatorio' })
      .transform(sanitizeString)
      .refine((v) => v.length >= 1, 'El concepto o título del presupuesto es obligatorio')
      .refine((v) => v.length <= 200, 'El título no puede superar los 200 caracteres'),
    totalAmount: z
      .number({ required_error: 'El monto total es obligatorio' })
      .int('El monto total debe ser un entero estricto sin decimales (RN-01)')
      .positive('El monto debe ser mayor a 0'),
    currency: z
      .string()
      .transform(sanitizeString)
      .refine((v) => v.length <= 10, 'La moneda no puede superar los 10 caracteres')
      .default('USD'),
    milestones: z.array(milestoneInputSchema).min(1, 'Debe incluir al menos 1 hito de cobro'),
  })
  .refine(
    (data) => {
      const sumPercentages = data.milestones.reduce((acc, m) => acc + m.percentage, 0);
      return sumPercentages === 100;
    },
    {
      message: 'La suma de los porcentajes de los hitos debe ser exactamente 100% (RN-02).',
      path: ['milestones'],
    }
  );

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
