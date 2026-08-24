'use client';

import type { ReactNode } from 'react';

export type AuthComponentBoundaryProps = {
  readonly children?: ReactNode;
};

export type AuthComponentsBoundary = (props: AuthComponentBoundaryProps) => ReactNode;
