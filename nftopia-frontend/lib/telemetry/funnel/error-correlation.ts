// Utility for linking navigation abandonment to prior error events in the funnel

export interface ErrorCorrelationState {
  lastErrorCode?: string;
  lastErrorTimestamp?: number;
  errorSequence?: string[];
}

export class ErrorCorrelation {
  private static state: ErrorCorrelationState = {};

  static recordError(errorCode: string) {
    this.state.lastErrorCode = errorCode;
    this.state.lastErrorTimestamp = Date.now();
    if (!this.state.errorSequence) this.state.errorSequence = [];
    this.state.errorSequence.push(errorCode);
  }

  static getLastError(): { code?: string; timestamp?: number } {
    return {
      code: this.state.lastErrorCode,
      timestamp: this.state.lastErrorTimestamp,
    };
  }

  static getErrorSequence(): string[] {
    return this.state.errorSequence ? [...this.state.errorSequence] : [];
  }

  static clear() {
    this.state = {};
  }
}
