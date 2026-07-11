import { ExperimentDefinition, VariantAssignment } from './types';
import { EXPERIMENT_REGISTRY } from './registry';
import crypto from 'crypto';

export class ExperimentAssignmentEngine {
  /**
   * Deterministically assign a user/session/device to a variant using hash of assignment seed.
   * Ensures stable assignment across sessions and rollout gating.
   */
  static assignVariant(
    experiment: ExperimentDefinition,
    assignmentSeed: string // user_id, session_id, or device_id
  ): VariantAssignment {
    // Hash the seed to get a 0-100 score
    const hash = crypto
      .createHash('md5')
      .update(`${experiment.experiment_id}:${assignmentSeed}`)
      .digest('hex');
    const hashScore = parseInt(hash.substring(0, 8), 16) % 100;

    // Rollout gate: assign control if outside rollout percentage
    if (hashScore >= experiment.rollout_percentage) {
      const control = experiment.variants.find(v => v.is_control);
      return {
        experiment_id: experiment.experiment_id,
        variant_id: control!.variant_id,
        variant_name: control!.variant_name,
        is_control: true,
        assigned_at_timestamp_ms: Date.now(),
      };
    }

    // Within rollout: assign variant by proportional distribution
    const totalVariants = experiment.variants.length;
    const variantIndex = hashScore % totalVariants;
    const assignedVariant = experiment.variants[variantIndex];
    return {
      experiment_id: experiment.experiment_id,
      variant_id: assignedVariant.variant_id,
      variant_name: assignedVariant.variant_name,
      is_control: assignedVariant.is_control,
      assigned_at_timestamp_ms: Date.now(),
    };
  }

  /**
   * Get all active variant assignments for a surface.
   */
  static getAssignmentsForSurface(
    surface: string,
    assignmentSeed: string,
    experiments: ExperimentDefinition[] = EXPERIMENT_REGISTRY
  ): Map<string, VariantAssignment> {
    const applicableExperiments = experiments.filter(
      exp => exp.status === 'running' && exp.surfaces.includes(surface)
    );
    const assignments = new Map<string, VariantAssignment>();
    for (const exp of applicableExperiments) {
      assignments.set(exp.experiment_id, this.assignVariant(exp, assignmentSeed));
    }
    return assignments;
  }
}
