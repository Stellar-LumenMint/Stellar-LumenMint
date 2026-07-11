// ExperimentProvider wrapper for Next.js app layout
'use client';
import React, { useMemo } from 'react';
import { ExperimentProvider } from './context';
import { ExperimentAssignmentEngine } from './assignment';
import { EXPERIMENT_REGISTRY } from './registry';
import { loadAssignments, saveAssignments } from './storage';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function ExperimentProviderWrapper({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  // Use user_id if logged in, else fallback to session id
  const assignmentSeed = user?.id || getSessionId();

  // Try to load persisted assignments, else assign new
  const assignments = useMemo(() => {
    const loaded = loadAssignments();
    if (loaded) return loaded;
    const assigned = ExperimentAssignmentEngine.getAssignmentsForSurface(
      'all_surfaces',
      assignmentSeed,
      EXPERIMENT_REGISTRY
    );
    saveAssignments(assigned);
    return assigned;
  }, [assignmentSeed]);

  return <ExperimentProvider assignments={assignments}>{children}</ExperimentProvider>;
}

// Helper to get or generate a session id
function getSessionId() {
  let sid = typeof window !== 'undefined' ? sessionStorage.getItem('experiment_session_id') : null;
  if (!sid) {
    sid = crypto.randomUUID();
    if (typeof window !== 'undefined') sessionStorage.setItem('experiment_session_id', sid);
  }
  return sid;
}
