import { AbandonmentSignalType } from './types';

export interface StageState {
  stageEnterTime: number;
  interactionCount: number;
  retryCount?: number;
  recentErrorCodes?: string[];
}

export interface AbandonmentSignal {
  signal: AbandonmentSignalType;
  timeInStage: number;
  severity: 'high' | 'critical';
  retryCount?: number;
  errorCodeSequence?: string[];
}

export class BottleneckDetector {
  private static STALL_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  private static MAX_RETRIES_THRESHOLD = 3;
  private static MIN_INTERACTIONS_THRESHOLD = 1;

  static detectAbandonmentSignal(stageState: StageState): AbandonmentSignal | null {
    const timeInStage = Date.now() - stageState.stageEnterTime;
    // Signal 1: Stalled without interaction
    if (
      timeInStage > this.STALL_THRESHOLD_MS &&
      stageState.interactionCount === 0
    ) {
      return {
        signal: 'stalled_no_interaction',
        timeInStage,
        severity: 'high',
      };
    }
    // Signal 2: Max retries exceeded
    if ((stageState.retryCount || 0) >= this.MAX_RETRIES_THRESHOLD) {
      return {
        signal: 'max_retries_exceeded',
        retryCount: stageState.retryCount,
        timeInStage,
        severity: 'critical',
      };
    }
    // Signal 3: Error loop (error → exit → re-enter → error)
    if (
      stageState.recentErrorCodes &&
      stageState.recentErrorCodes.length >= 2
    ) {
      return {
        signal: 'error_loop',
        errorCodeSequence: stageState.recentErrorCodes,
        timeInStage,
        severity: 'critical',
      };
    }
    return null;
  }
}
