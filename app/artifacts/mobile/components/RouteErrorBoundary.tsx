import React from 'react';
import { ErrorFallback } from '@/components/ErrorFallback';

type RouteErrorBoundaryProps = {
  error: Error;
  retry: () => void;
};

export function RouteErrorBoundary({ error, retry }: RouteErrorBoundaryProps) {
  return <ErrorFallback error={error} resetError={retry} />;
}