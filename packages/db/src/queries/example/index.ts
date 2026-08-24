import 'server-only';

/** Server-only example query boundary marker; concrete query contracts are not in T01. */
export type ExampleQueriesBoundary = {
  readonly status: 'example-queries-not-implemented-in-t01';
};
