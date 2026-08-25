'use server';

import {
  archiveProjectForUser,
  createProjectForUser,
  deleteProjectForUser,
  restoreProjectForUser,
  updateProjectForUser,
} from '@repo/db/queries/example';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { revalidatePath } from 'next/cache';
import { returnServerError } from 'next-safe-action';

import { authenticatedAction, getSafeActionError } from '@/lib/actions/action-clients';

import {
  createProjectSchema,
  normalizeProjectDescription,
  projectOwnershipSchema,
  updateProjectSchema,
} from '../_schemas/project.schema';

/** Creates a project for the authenticated user without accepting a client user id. */
export const createProjectAction = authenticatedAction
  .inputSchema(createProjectSchema)
  .action(async ({ ctx, parsedInput }) => {
    const project = await createProjectForUser({
      userId: ctx.user.id,
      name: parsedInput.name,
      description: normalizeProjectDescription(parsedInput.description),
    });

    revalidateProjectsPath(ctx.locale);
    return { projectId: project.id };
  });

/** Updates a project through the authenticated user's SQL ownership predicate. */
export const updateProjectAction = authenticatedAction
  .inputSchema(updateProjectSchema)
  .action(async ({ ctx, parsedInput }) => {
    const project = await updateProjectForUser({
      projectId: parsedInput.projectId,
      userId: ctx.user.id,
      name: parsedInput.name,
      description: normalizeProjectDescription(parsedInput.description),
    });

    if (!project) {
      return returnServerError(await getSafeActionError('generic'));
    }

    revalidateProjectsPath(ctx.locale);
    revalidateProjectPath(ctx.locale, project.id);
    return { projectId: project.id };
  });

/** Archives a project only when it belongs to the authenticated user. */
export const archiveProjectAction = authenticatedAction
  .inputSchema(projectOwnershipSchema)
  .action(async ({ ctx, parsedInput }) => {
    const project = await archiveProjectForUser({
      projectId: parsedInput.projectId,
      userId: ctx.user.id,
    });

    if (!project) {
      return returnServerError(await getSafeActionError('generic'));
    }

    revalidateProjectsPath(ctx.locale);
    revalidateProjectPath(ctx.locale, project.id);
    return { status: project.status };
  });

/** Restores an archived project only when it belongs to the authenticated user. */
export const restoreProjectAction = authenticatedAction
  .inputSchema(projectOwnershipSchema)
  .action(async ({ ctx, parsedInput }) => {
    const project = await restoreProjectForUser({
      projectId: parsedInput.projectId,
      userId: ctx.user.id,
    });

    if (!project) {
      return returnServerError(await getSafeActionError('generic'));
    }

    revalidateProjectsPath(ctx.locale);
    revalidateProjectPath(ctx.locale, project.id);
    return { status: project.status };
  });

/** Deletes a project only when it belongs to the authenticated user. */
export const deleteProjectAction = authenticatedAction
  .inputSchema(projectOwnershipSchema)
  .action(async ({ ctx, parsedInput }) => {
    const deleted = await deleteProjectForUser({
      projectId: parsedInput.projectId,
      userId: ctx.user.id,
    });

    if (!deleted) {
      return returnServerError(await getSafeActionError('generic'));
    }

    revalidateProjectsPath(ctx.locale);
    revalidateProjectPath(ctx.locale, parsedInput.projectId);
    return { deleted: true };
  });

function revalidateProjectsPath(
  locale: Parameters<typeof getLocalizedPathname>[0]['locale'],
): void {
  revalidatePath(getLocalizedPathname({ locale, pathname: '/projects' }));
}

function revalidateProjectPath(
  locale: Parameters<typeof getLocalizedPathname>[0]['locale'],
  projectId: string,
): void {
  revalidatePath(getLocalizedPathname({ locale, pathname: `/projects/${projectId}` }));
}
