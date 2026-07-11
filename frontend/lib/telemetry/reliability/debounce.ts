import { DebounceRule } from './config';

interface DebounceState {
  [eventKey: string]: {
    lastEvent: any;
    timer: NodeJS.Timeout | null;
  };
}

export class TelemetryDebouncer {
  private state: DebounceState = {};
  private rules: DebounceRule[];

  constructor(rules: DebounceRule[]) {
    this.rules = rules;
  }

  shouldDebounce(eventName: string): DebounceRule | undefined {
    return this.rules.find(r => r.eventName === eventName);
  }

  debounce(eventKey: string, event: any, rule: DebounceRule, dispatch: (event: any) => void) {
    if (!this.state[eventKey]) {
      this.state[eventKey] = { lastEvent: event, timer: null };
    }
    if (this.state[eventKey].timer) {
      clearTimeout(this.state[eventKey].timer!);
    }
    this.state[eventKey].lastEvent = event;
    this.state[eventKey].timer = setTimeout(() => {
      dispatch(this.state[eventKey].lastEvent);
      this.state[eventKey].timer = null;
    }, rule.windowMs);
  }
}
