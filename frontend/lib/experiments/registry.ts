import { ExperimentDefinition, ExperimentStatus } from './types';

export const EXPERIMENT_REGISTRY: ExperimentDefinition[] = [
  {
    experiment_id: 'hero-cta-placement-2026-q2',
    experiment_name: 'Hero CTA Placement Optimization',
    description: 'Test primary vs secondary placement of "Explore" CTA in landing hero',
    status: ExperimentStatus.RUNNING,
    start_date: '2026-05-15',
    hypothesis: 'Secondary placement in lower hero section will increase CTR by 12%',
    predicted_uplift_pct: 12,
    variants: [
      {
        variant_id: 'hero-primary-placement',
        variant_name: 'Control - Primary Placement',
        is_control: true,
        cta_label: 'Explore Collections',
        placement_override: 'hero_primary_cta',
        description: 'Primary hero CTA (control)',
      },
      {
        variant_id: 'hero-secondary-placement',
        variant_name: 'Secondary Placement',
        is_control: false,
        cta_label: 'Explore Collections',
        placement_override: 'hero_secondary_info_section',
        description: 'Secondary hero info section CTA',
      },
    ],
    target_segment: 'all',
    rollout_percentage: 50,
    randomization_seed: 'user_id',
    surfaces: ['landing_hero'],
    owner: 'Product - Growth',
    success_metric: 'click_through_rate',
    minimum_sample_size: 5000,
  },
  {
    experiment_id: 'creator-onboarding-copy-2026-q2',
    experiment_name: 'Creator Onboarding Copy Variants',
    description: 'Test copy variations for creator activation CTA',
    status: ExperimentStatus.RUNNING,
    start_date: '2026-05-20',
    hypothesis: 'Action-oriented copy "Start Minting" will outperform "Create Collection" by 8%',
    predicted_uplift_pct: 8,
    variants: [
      {
        variant_id: 'creator-copy-create-collection',
        variant_name: 'Control - Create Collection',
        is_control: true,
        cta_label: 'Create Collection',
        description: 'Control copy',
      },
      {
        variant_id: 'creator-copy-start-minting',
        variant_name: 'Variant - Start Minting',
        is_control: false,
        cta_label: 'Start Minting',
        description: 'Action-oriented copy',
      },
      {
        variant_id: 'creator-copy-mint-first-nft',
        variant_name: 'Variant - Mint Your First NFT',
        is_control: false,
        cta_label: 'Mint Your First NFT',
        description: 'Encourages first NFT creation',
      },
    ],
    target_segment: 'creators_only',
    rollout_percentage: 100,
    randomization_seed: 'user_id',
    surfaces: ['creator_dashboard_cta'],
    owner: 'Product - Creator',
    success_metric: 'creator_collection_created',
    minimum_sample_size: 2000,
  },
];

export function getExperimentByID(experimentID: string) {
  return EXPERIMENT_REGISTRY.find(exp => exp.experiment_id === experimentID);
}

export function getActiveExperimentsForSurface(surface: string) {
  return EXPERIMENT_REGISTRY.filter(
    exp => exp.status === ExperimentStatus.RUNNING && exp.surfaces.includes(surface)
  );
}
