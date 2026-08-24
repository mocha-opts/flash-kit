import 'server-only';

/** Server-only billing query boundary marker; concrete query contracts are not in T01. */
export type BillingQueriesBoundary = {
  readonly status: 'billing-queries-not-implemented-in-t01';
};
