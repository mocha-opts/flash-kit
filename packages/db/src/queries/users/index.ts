import 'server-only';

/** Server-only user query boundary marker; concrete query contracts are not in T01. */
export type UserQueriesBoundary = {
  readonly status: 'user-queries-not-implemented-in-t01';
};
