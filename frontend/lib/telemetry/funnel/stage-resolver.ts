import { FunnelStage } from './types';

export interface StageResolutionContext {
  nextPathname: string;
  query?: Record<string, any>;
  hash?: string;
}

/**
 * Resolves a route path to a funnel stage and normalized route.
 * Strips locale prefix and matches against known patterns.
 */
export function resolveStageFromRoute(context: StageResolutionContext): {
  stage: FunnelStage;
  isStageTransition: boolean;
  routeNormalized: string;
} {
  const { nextPathname } = context;
  // Strip locale prefix (e.g., /en, /en/, /en/explore → /, /explore)
  let routeWithoutLocale = nextPathname.replace(/^\/[a-z]{2}(-[a-z]{2})?(\/|$)/, '/');
  if (routeWithoutLocale === '' || routeWithoutLocale === '//') routeWithoutLocale = '/';

  // Stage resolution map
  const ROUTE_TO_STAGE_MAP: Record<string, FunnelStage> = {
    '^/$': FunnelStage.LANDING,
    '^/explore/?$': FunnelStage.EXPLORE_CATEGORIES,
    '^/explore/[^/]+/?$': FunnelStage.EXPLORE_CATEGORIES,
    '^/marketplace/?$': FunnelStage.MARKETPLACE_BROWSE,
    '^/marketplace/filter': FunnelStage.MARKETPLACE_FILTERED, // move this above collection detail
    '^/marketplace/[^/]+/?$': FunnelStage.COLLECTION_DETAIL,
    '^/artists?/[^/]+/?$': FunnelStage.ARTIST_PROFILE,
    '^/vault/?$': FunnelStage.VAULT_HOLDINGS,
    '^/creator-dashboard/?$': FunnelStage.CREATOR_ACTIVATION,
    '^/creator-dashboard/create.*': FunnelStage.CREATE_COLLECTION,
    '^/creator-dashboard/mint.*': FunnelStage.MINT_NFT,
    '^/auth/(login|register)/?$': FunnelStage.AUTHENTICATION,
  };

  let resolvedStage = FunnelStage.LANDING; // default fallback
  for (const [pattern, stage] of Object.entries(ROUTE_TO_STAGE_MAP)) {
    if (new RegExp(pattern).test(routeWithoutLocale)) {
      resolvedStage = stage;
      break;
    }
  }

  return {
    stage: resolvedStage,
    isStageTransition: true, // caller should diff against previous stage
    routeNormalized: routeWithoutLocale,
  };
}
