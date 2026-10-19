import { z } from 'zod';
import { sanitizeString, idParamSchema } from '../../middlewares/sanitize';
import { RECURRING_AMOUNT_REQUIRED, RENEWAL_DATE_REQUIRED } from './domain';

export const projectCategorySchema = z.enum(['LANDING', 'ECOMMERCE', 'CORPORATE', 'WEBAPP']);
export const projectStatusSchema = z.enum(['PROSPECT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const productionStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const recurringPeriodSchema = z.enum(['MONTHLY', 'ANNUALLY']);

export const projectCreateSchema = z.object({
  clientId: idParamSchema,
  title: z
    .string({ required_error: 'El título del proyecto es obligatorio' })
    .transform(sanitizeString)
    .refine((v) => v.length >= 1, 'El título del proyecto es obligatorio')
    .refine((v) => v.length <= 200, 'El título no puede superar los 200 caracteres'),
  category: projectCategorySchema,
  status: projectStatusSchema.default('PROSPECT'),
  productionUrl: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 500, 'La URL no puede superar los 500 caracteres')
    .pipe(z.string().url('URL de producción inválida').or(z.literal('')))
    .optional()
    .nullable(),
  productionStatus: productionStatusSchema.default('ACTIVE'),
  codeRepoUrl: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 500, 'La URL no puede superar los 500 caracteres')
    .pipe(z.string().url('URL de repositorio inválida').or(z.literal('')))
    .optional()
    .nullable(),
  resourcesUrl: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 500, 'La URL no puede superar los 500 caracteres')
    .pipe(z.string().url('URL de recursos inválida').or(z.literal('')))
    .optional()
    .nullable(),
  hasRecurring: z.number().int().min(0).max(1).default(0),
  recurringAmount: z.number().nonnegative('El monto recurrente debe ser mayor o igual a 0').optional().nullable(),
  recurringCurrency: z
    .string()
    .transform(sanitizeString)
    .refine((v) => v.length <= 10, 'La moneda no puede superar los 10 caracteres')
    .default('USD'),
  recurringPeriod: recurringPeriodSchema.default('ANNUALLY'),
  recurringRenewalDate: z
    .string()
    .transform(sanitizeString)
    .pipe(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD')
        .or(z.literal('')),
    )
    .optional()
    .nullable(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const projectSoftEditSchema = projectCreateSchema
  .omit({ clientId: true, status: true })
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    if (data.hasRecurring === 1) {
      if (!data.recurringRenewalDate || data.recurringRenewalDate.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurringRenewalDate'], message: RENEWAL_DATE_REQUIRED });
      }
      if (data.recurringAmount === undefined || data.recurringAmount === null || data.recurringAmount <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurringAmount'], message: RECURRING_AMOUNT_REQUIRED });
      }
    }
  });

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectSoftEditInput = z.infer<typeof projectSoftEditSchema>;
export type ProjectCategory = z.infer<typeof projectCategorySchema>;
export type ProjectStatusFilter = z.infer<typeof projectStatusSchema>;

/** Filtro opcional de query string: un valor desconocido equivale a "sin filtro". */
function parseEnumFilter<T extends z.ZodTypeAny>(schema: T, raw: string | undefined): z.infer<T> | null {
  const clean = raw ? sanitizeString(raw).toUpperCase() : null;
  const parsed = clean ? schema.safeParse(clean) : null;
  return parsed?.success ? parsed.data : null;
}

export const parseProjectStatusFilter = (raw: string | undefined): ProjectStatusFilter | null =>
  parseEnumFilter(projectStatusSchema, raw);

export const parseProjectCategoryFilter = (raw: string | undefined): ProjectCategory | null =>
  parseEnumFilter(projectCategorySchema, raw);
