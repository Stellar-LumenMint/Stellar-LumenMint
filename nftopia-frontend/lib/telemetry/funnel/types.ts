// FunnelStage Enum
export enum FunnelStage {
  LANDING = 'landing',
  EXPLORE_CATEGORIES = 'explore_categories',
  MARKETPLACE_BROWSE = 'marketplace_browse',
  ARTIST_PROFILE = 'artist_profile',
  COLLECTION_DETAIL = 'collection_detail',
  VAULT_HOLDINGS = 'vault_holdings',
  MARKETPLACE_FILTERED = 'marketplace_filtered',
  CREATOR_ACTIVATION = 'creator_activation',
  CREATE_COLLECTION = 'create_collection',
  MINT_NFT = 'mint_nft',
  AUTHENTICATION = 'authentication',
}

export type FunnelStageName =
  | 'landing'
  | 'explore_categories'
  | 'marketplace_browse'
  | 'artist_profile'
  | 'collection_detail'
  | 'vault_holdings'
  | 'marketplace_filtered'
  | 'creator_activation'
  | 'create_collection'
  | 'mint_nft'
  | 'authentication';

export enum NavigationMethod {
  DIRECT = 'direct',
  BREADCRUMB = 'breadcrumb',
  NAV_ITEM = 'nav_item',
  CTA_CLICK = 'cta_click',
  BACK_BUTTON = 'back_button',
  DIRECT_URL = 'direct_url',
  SEARCH = 'search',
}

export enum StageExitReason {
  PROGRESSION = 'progression',
  ABANDONMENT = 'abandonment',
  MODAL_INTERRUPT = 'modal_interrupt',
  ERROR_BLOCK = 'error_block',
  SESSION_TIMEOUT = 'session_timeout',
}

export type UserCohort = 'new' | 'returning' | 'creator' | 'collector';

// Funnel Event Payloads
export interface FunnelStageEnteredPayload {
  stage: FunnelStage;
  stage_sequence_number: number;
  timestamp_ms?: number;
  route_path: string;
  referrer_stage?: FunnelStage;
  referrer_route?: string;
  navigation_method: NavigationMethod;
  time_in_prior_stage_ms?: number;
  is_returning_to_stage: boolean;
  re_entry_count?: number;
  error_code_prior_to_exit?: string;
  user_cohort: UserCohort;
}

export interface FunnelStageExitedPayload {
  stage: FunnelStage;
  exit_reason: StageExitReason;
  next_stage?: FunnelStage;
  next_route?: string;
  time_in_stage_ms: number;
  interactions_count: number;
  bounce: boolean;
  stage_sequence_number: number;
  error_code?: string;
}

export type AbandonmentSignalType =
  | 'stalled_no_interaction'
  | 'max_retries_exceeded'
  | 'error_loop'
  | 'repeated_back_nav';

export interface NavigationAbandonmentSignalPayload {
  stage: FunnelStage;
  abandonment_signal: AbandonmentSignalType;
  time_in_stage_ms: number;
  interaction_count: number;
  retry_count?: number;
  error_code_sequence?: string[];
  suggested_action: string;
}

export type FunnelConversionType =
  | 'wallet_connected'
  | 'collection_viewed_to_bid'
  | 'nft_purchased'
  | 'bid_submitted'
  | 'collection_created'
  | 'listing_created';

export interface FunnelConversionAchievedPayload {
  conversion_type: FunnelConversionType;
  source_stage: FunnelStage;
  funnel_stages_traversed: FunnelStage[];
  total_time_to_conversion_ms: number;
  stage_exit_count: number;
  error_count_pre_conversion: number;
  conversion_latency_ms?: number;
  user_cohort: UserCohort;
}

export interface FunnelAnalyticsContextPayload {
  journey_session_id: string;
  session_start_timestamp_ms: number;
  initial_referrer?: string;
  device_type: 'desktop' | 'tablet' | 'mobile';
  locale: string;
  user_cohort: UserCohort;
  is_authenticated: boolean;
  entry_funnel_stage: FunnelStage;
  predicted_user_intent: 'browsing' | 'creator_onboarding' | 'collector_shopping' | 'vault_mgmt';
}
