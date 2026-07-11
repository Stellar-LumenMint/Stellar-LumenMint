import { SamplingRule } from './config';

export function shouldSampleEvent(eventName: string, rules: SamplingRule[]): boolean {
  const rule = rules.find(r => r.eventName === eventName);
  const rate = rule ? rule.rate : 1.0;
  if (rate >= 1.0) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}
