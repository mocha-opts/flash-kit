'use client';

import type { ReactNode } from 'react';

/** Client component boundary props; children are optional content only. */
export type AuthComponentBoundaryProps = {
  readonly children?: ReactNode;
};

/** Client-only component contract that must not reach server auth runtime. */
export type AuthComponentsBoundary = (props: AuthComponentBoundaryProps) => ReactNode;
