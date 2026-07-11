import { EXPERIMENT_REGISTRY } from '../registry';

describe('EXPERIMENT_REGISTRY', () => {
  it('has unique experiment_ids', () => {
    const ids = EXPERIMENT_REGISTRY.map(e => e.experiment_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all variants have is_control true or false', () => {
    for (const exp of EXPERIMENT_REGISTRY) {
      for (const v of exp.variants) {
        expect(typeof v.is_control).toBe('boolean');
      }
    }
  });

  it('rollout_percentage is between 0 and 100', () => {
    for (const exp of EXPERIMENT_REGISTRY) {
      expect(exp.rollout_percentage).toBeGreaterThanOrEqual(0);
      expect(exp.rollout_percentage).toBeLessThanOrEqual(100);
    }
  });

  it('status is a valid enum value', () => {
    const valid = [
      'draft', 'running', 'paused', 'completed', 'rolled_out', 'archived',
    ];
    for (const exp of EXPERIMENT_REGISTRY) {
      expect(valid).toContain(exp.status);
    }
  });
});
