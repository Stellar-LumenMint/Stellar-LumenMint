'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Gate for authenticated-only content.
 *
 * While auth state resolves it renders a skeleton instead of the children,
 * so protected content never flashes before the redirect fires on slow
 * loads. The skeleton stays visible during the redirect itself (not just
 * during auth resolution) to avoid a blank-screen hop.
 */
export default function ProtectedRoute({
  children,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const redirectFired = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !redirectFired.current) {
      redirectFired.current = true;
      setRedirecting(true);
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  if (isLoading || redirecting) {
    return (
      <div
        className="flex min-h-screen flex-col gap-4 p-6"
        role="status"
        aria-label="Checking authentication"
      >
        <Skeleton height={32} width={220} />
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="85%" />
        <Skeleton height={200} width="100%" />
        <Skeleton height={16} width="60%" />
        <Skeleton height={16} width="75%" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
