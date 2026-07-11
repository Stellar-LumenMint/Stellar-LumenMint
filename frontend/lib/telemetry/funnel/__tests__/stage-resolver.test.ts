import { resolveStageFromRoute } from '../stage-resolver';
import { FunnelStage } from '../types';

describe('resolveStageFromRoute', () => {
  it('resolves landing', () => {
    expect(resolveStageFromRoute({ nextPathname: '/en' }).stage).toBe(FunnelStage.LANDING);
    expect(resolveStageFromRoute({ nextPathname: '/' }).stage).toBe(FunnelStage.LANDING);
  });
  it('resolves explore', () => {
    expect(resolveStageFromRoute({ nextPathname: '/en/explore' }).stage).toBe(FunnelStage.EXPLORE_CATEGORIES);
    expect(resolveStageFromRoute({ nextPathname: '/explore' }).stage).toBe(FunnelStage.EXPLORE_CATEGORIES);
    expect(resolveStageFromRoute({ nextPathname: '/explore/abstract' }).stage).toBe(FunnelStage.EXPLORE_CATEGORIES);
  });
  it('resolves marketplace', () => {
    expect(resolveStageFromRoute({ nextPathname: '/marketplace' }).stage).toBe(FunnelStage.MARKETPLACE_BROWSE);
    expect(resolveStageFromRoute({ nextPathname: '/marketplace/123' }).stage).toBe(FunnelStage.COLLECTION_DETAIL);
    expect(resolveStageFromRoute({ nextPathname: '/marketplace/filter' }).stage).toBe(FunnelStage.MARKETPLACE_FILTERED);
  });
  it('resolves artist profile', () => {
    expect(resolveStageFromRoute({ nextPathname: '/artists/abc' }).stage).toBe(FunnelStage.ARTIST_PROFILE);
  });
  it('resolves vault', () => {
    expect(resolveStageFromRoute({ nextPathname: '/vault' }).stage).toBe(FunnelStage.VAULT_HOLDINGS);
  });
  it('resolves creator dashboard', () => {
    expect(resolveStageFromRoute({ nextPathname: '/creator-dashboard' }).stage).toBe(FunnelStage.CREATOR_ACTIVATION);
    expect(resolveStageFromRoute({ nextPathname: '/creator-dashboard/create' }).stage).toBe(FunnelStage.CREATE_COLLECTION);
    expect(resolveStageFromRoute({ nextPathname: '/creator-dashboard/mint' }).stage).toBe(FunnelStage.MINT_NFT);
  });
  it('resolves authentication', () => {
    expect(resolveStageFromRoute({ nextPathname: '/auth/login' }).stage).toBe(FunnelStage.AUTHENTICATION);
    expect(resolveStageFromRoute({ nextPathname: '/auth/register' }).stage).toBe(FunnelStage.AUTHENTICATION);
  });
});
