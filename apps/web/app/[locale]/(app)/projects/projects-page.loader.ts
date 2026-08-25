import 'server-only';

import { listProjectsForUser } from '@repo/db/queries/example';

import {
  type ProjectListSearchParams,
  projectListSearchParamsSchema,
} from './_schemas/project.schema';

export type ProjectPageSearchParams = Record<string, string | string[] | undefined>;

export type ProjectsPageData = {
  readonly filters: ProjectListSearchParams;
  readonly page: Awaited<ReturnType<typeof listProjectsForUser>>;
};

/**
 * Route-local server loader. URL filters are parsed here before the user-scoped
 * query receives them; the user id always comes from the authenticated server.
 */
export async function loadProjectsPage(
  userId: string,
  searchParams: ProjectPageSearchParams,
): Promise<ProjectsPageData> {
  const parsedSearchParams = projectListSearchParamsSchema.parse({
    page: getSingleSearchParam(searchParams.page),
    limit: getSingleSearchParam(searchParams.limit),
    status: getSingleSearchParam(searchParams.status),
    notice: getSingleSearchParam(searchParams.notice),
  });

  const page = await listProjectsForUser({
    userId,
    page: parsedSearchParams.page,
    limit: parsedSearchParams.limit,
    status: parsedSearchParams.status === 'all' ? 'all' : parsedSearchParams.status,
  });

  return { filters: parsedSearchParams, page };
}

function getSingleSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
