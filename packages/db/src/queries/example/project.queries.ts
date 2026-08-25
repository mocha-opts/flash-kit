import 'server-only';

import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '#db/client/index';
import { type ProjectStatus, project } from '#db/schema/index';

export type ProjectRecord = typeof project.$inferSelect;
export type ProjectStatusFilter = ProjectStatus | 'all';

export type ListProjectsForUserInput = {
  readonly userId: string;
  readonly page: number;
  readonly limit: number;
  readonly status: ProjectStatusFilter;
};

export type ProjectPage = {
  readonly projects: ProjectRecord[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
};

export type CreateProjectForUserInput = {
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
};

export type UpdateProjectForUserInput = {
  readonly projectId: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
};

export type ProjectOwnershipInput = {
  readonly projectId: string;
  readonly userId: string;
};

/** Lists only the trusted user's projects, with offset pagination and status filtering. */
export async function listProjectsForUser({
  userId,
  page,
  limit,
  status,
}: ListProjectsForUserInput): Promise<ProjectPage> {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 25;
  const offset = (safePage - 1) * safeLimit;
  const where = getProjectListWhere(userId, status);

  const [projects, countRows] = await Promise.all([
    db
      .select()
      .from(project)
      .where(where)
      .orderBy(desc(project.createdAt), desc(project.id))
      .limit(safeLimit)
      .offset(offset),
    db.select({ total: count() }).from(project).where(where),
  ]);
  const total = countRows[0]?.total ?? 0;

  return {
    projects,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

/** Reads one project only when both its id and its trusted owner match. */
export async function findProjectForUser(
  input: ProjectOwnershipInput,
): Promise<ProjectRecord | null> {
  const rows = await db
    .select()
    .from(project)
    .where(and(eq(project.id, input.projectId), eq(project.userId, input.userId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Creates a project owned by the trusted user from the authenticated context. */
export async function createProjectForUser(
  input: CreateProjectForUserInput,
): Promise<ProjectRecord> {
  const rows = await db
    .insert(project)
    .values({
      userId: input.userId,
      name: input.name,
      description: input.description,
    })
    .returning();

  const createdProject = rows[0];

  if (!createdProject) {
    throw new Error('Project creation did not return a row.');
  }

  return createdProject;
}

/** Updates only a project owned by the trusted user; missing ownership returns null. */
export async function updateProjectForUser(
  input: UpdateProjectForUserInput,
): Promise<ProjectRecord | null> {
  const rows = await db
    .update(project)
    .set({
      name: input.name,
      description: input.description,
      updatedAt: new Date(),
    })
    .where(and(eq(project.id, input.projectId), eq(project.userId, input.userId)))
    .returning();

  return rows[0] ?? null;
}

/** Archives only a project owned by the trusted user; missing ownership returns null. */
export async function archiveProjectForUser(
  input: ProjectOwnershipInput,
): Promise<ProjectRecord | null> {
  const rows = await db
    .update(project)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(project.id, input.projectId), eq(project.userId, input.userId)))
    .returning();

  return rows[0] ?? null;
}

/** Restores an archived project owned by the trusted user. */
export async function restoreProjectForUser(
  input: ProjectOwnershipInput,
): Promise<ProjectRecord | null> {
  const rows = await db
    .update(project)
    .set({ status: 'active', updatedAt: new Date() })
    .where(and(eq(project.id, input.projectId), eq(project.userId, input.userId)))
    .returning();

  return rows[0] ?? null;
}

/** Deletes only a project owned by the trusted user and reports whether it existed. */
export async function deleteProjectForUser(input: ProjectOwnershipInput): Promise<boolean> {
  const rows = await db
    .delete(project)
    .where(and(eq(project.id, input.projectId), eq(project.userId, input.userId)))
    .returning({ id: project.id });

  return rows.length > 0;
}

function getProjectListWhere(userId: string, status: ProjectStatusFilter) {
  return and(eq(project.userId, userId), status === 'all' ? undefined : eq(project.status, status));
}
