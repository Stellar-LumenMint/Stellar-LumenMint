import { JourneySessionManager } from '../journey-session';
import { FunnelStage } from '../types';

describe('JourneySessionManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a new session and persists it', () => {
    const session = JourneySessionManager.getOrCreateSession(FunnelStage.LANDING, 'user1');
    expect(session.journey_session_id).toBeDefined();
    expect(session.user_id).toBe('user1');
    expect(session.stages_visited).toEqual([FunnelStage.LANDING]);
    const stored = JSON.parse(localStorage.getItem('stellar_lumenmint_funnel_journey_session')!);
    expect(stored.journey_session_id).toBe(session.journey_session_id);
  });

  it('reuses session within 24h idle window', () => {
    const session1 = JourneySessionManager.getOrCreateSession(FunnelStage.LANDING, 'user1');
    const session2 = JourneySessionManager.getOrCreateSession(FunnelStage.LANDING, 'user1');
    expect(session2.journey_session_id).toBe(session1.journey_session_id);
  });

  it('invalidates session on logout', () => {
    JourneySessionManager.getOrCreateSession(FunnelStage.LANDING, 'user1');
    JourneySessionManager.invalidateSession();
    expect(localStorage.getItem('stellar_lumenmint_funnel_journey_session')).toBeNull();
  });

  it('tracks stage transitions', () => {
    const session = JourneySessionManager.getOrCreateSession(FunnelStage.LANDING, 'user1');
    JourneySessionManager.trackStageTransition(session, FunnelStage.EXPLORE_CATEGORIES);
    expect(session.stages_visited).toContain(FunnelStage.EXPLORE_CATEGORIES);
  });
});
