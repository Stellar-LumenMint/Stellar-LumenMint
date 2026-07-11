// Experiment core types and enums for CTA placement/copy experiments

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ROLLED_OUT = 'rolled_out',
  ARCHIVED = 'archived',
}

export type ExperimentStatusName =
  | 'draft'
  | 'running'
  | 'paused'
  | 'completed'
  | 'rolled_out'
  | 'archived';

export enum InteractionType {
  CLICK = 'click',
  HOVER = 'hover',
  FOCUS = 'focus',
  DISMISS = 'dismiss',
  IMPRESSION = 'impression', // tracked separately, not user interaction
}

export enum PlacementCategory {
  FEATURE_HERO = 'feature_hero',
  INLINE_CARD = 'inline_card',
  MODAL_CTA = 'modal_cta',
  EXIT_INTENT = 'exit_intent',
  SIDEBAR_CTA = 'sidebar_cta',
  INLINE_FORM = 'inline_form',
  ONBOARDING_MODAL = 'onboarding_modal',
}

export interface ExperimentDefinition {
  experiment_id: string;
  experiment_name: string;
  description: string;
  status: ExperimentStatus;
  start_date: string; // ISO 8601 (YYYY-MM-DD)
  end_date?: string;
  hypothesis: string;
  predicted_uplift_pct: number;
  variants: Array<{
    variant_id: string;
    variant_name: string;
    is_control: boolean;
    cta_label?: string;
    cta_icon?: string;
    cta_color?: string;
    placement_override?: string;
    description: string;
  }>;
  target_segment?: string;
  rollout_percentage: number;
  randomization_seed: 'user_id' | 'session_id' | 'device_id';
  surfaces: string[];
  owner: string;
  success_metric: string;
  minimum_sample_size?: number;
}

export interface VariantAssignment {
  experiment_id: string;
  variant_id: string;
  variant_name: string;
  is_control: boolean;
  assigned_at_timestamp_ms: number;
}
