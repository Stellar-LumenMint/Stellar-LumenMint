import { FunnelStage } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface FunnelJourneySession {
  journey_session_id: string;
  user_id?: string;
  anonymous_id?: string;
  session_start_timestamp_ms: number;
  session_idle_cutoff_ms: number;
  last_activity_timestamp_ms: number;
  initial_referrer?: string;
  initial_funnel_stage: FunnelStage;
  stages_visited: FunnelStage[];
  is_active: boolean;
}

export class JourneySessionManager {
  private static STORAGE_KEY = 'stellar_lumenmint_funnel_journey_session';
  private static SESSION_IDLE_MS = 24 * 60 * 60 * 1000; // 24 hours

  static getOrCreateSession(initialStage: FunnelStage, userId?: string): FunnelJourneySession {
    const stored = this.loadFromStorage();
    const now = Date.now();
    if (stored && (now - stored.last_activity_timestamp_ms < this.SESSION_IDLE_MS)) {
      stored.last_activity_timestamp_ms = now;
      this.saveToStorage(stored);
      return stored;
    }
    const session: FunnelJourneySession = {
      journey_session_id: uuidv4(),
      user_id: userId,
      session_start_timestamp_ms: now,
      session_idle_cutoff_ms: this.SESSION_IDLE_MS,
      last_activity_timestamp_ms: now,
      initial_funnel_stage: initialStage,
      stages_visited: [initialStage],
      is_active: true,
    };
    this.saveToStorage(session);
    return session;
  }

  static invalidateSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  static trackStageTransition(session: FunnelJourneySession, newStage: FunnelStage): void {
    if (!session.stages_visited.includes(newStage)) {
      session.stages_visited.push(newStage);
    }
    session.last_activity_timestamp_ms = Date.now();
    this.saveToStorage(session);
  }

  private static loadFromStorage(): FunnelJourneySession | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private static saveToStorage(session: FunnelJourneySession): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  }
}
