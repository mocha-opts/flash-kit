import { z } from 'zod';

export const projectStatuses = ['all', 'active', 'archived'] as const;

export type ProjectStatusFilter = (typeof projectStatuses)[number];

const projectNameSchema = z
  .string({ error: 'nameInvalid' })
  .trim()
  .min(1, { error: 'nameRequired' })
  .max(120, { error: 'nameTooLong' });

const projectDescriptionSchema = z
  .string({ error: 'descriptionInvalid' })
  .trim()
  .max(2_000, { error: 'descriptionTooLong' })
  .optional();

export const projectFormSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema,
});

export const createProjectSchema = projectFormSchema;

export const projectIdSchema = z
  .string({ error: 'projectInvalid' })
  .trim()
  .min(1, { error: 'projectInvalid' })
  .max(100, { error: 'projectInvalid' });

export const updateProjectSchema = projectFormSchema.extend({
  projectId: projectIdSchema,
});

export const projectOwnershipSchema = z.object({
  projectId: projectIdSchema,
});

export const projectListSearchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(25),
  status: z.enum(projectStatuses).catch('all'),
  notice: z
    .enum(['created', 'saved', 'archived', 'restored', 'deleted'])
    .optional()
    .catch(undefined),
});

export type ProjectFormInput = z.input<typeof projectFormSchema>;
export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type ProjectOwnershipInput = z.input<typeof projectOwnershipSchema>;
export type ProjectListSearchParams = z.infer<typeof projectListSearchParamsSchema>;

/** Converts an optional form description into the nullable database contract. */
export function normalizeProjectDescription(description: string | undefined): string | null {
  const normalized = description?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}
