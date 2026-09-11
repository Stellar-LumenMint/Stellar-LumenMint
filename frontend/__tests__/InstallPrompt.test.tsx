import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import InstallPrompt from '../components/InstallPrompt';

function makeMatchMedia(matches: boolean) {
  return jest.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

function fireInstallPrompt() {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: jest.Mock;
    userChoice: Promise<{ outcome: string; platform: string }>;
  };
  event.prompt = jest.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
  window.dispatchEvent(event);
  return event;
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    window.matchMedia = makeMatchMedia(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders nothing until the browser offers the install prompt', () => {
    render(<InstallPrompt />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the dialog after a deferred install prompt arrives', () => {
    render(<InstallPrompt />);

    act(() => {
      fireInstallPrompt();
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^install$/i })).toBeInTheDocument();
  });

  it('hides the dialog and remembers a dismissal across sessions', () => {
    render(<InstallPrompt />);

    act(() => {
      fireInstallPrompt();
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    fireEvent.click(screen.getByRole('button', { name: /dismiss install prompt/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('installPromptDismissedAt')).not.toBeNull();
  });

  it('stays hidden when a recent dismissal is stored', () => {
    window.localStorage.setItem('installPromptDismissedAt', String(Date.now()));

    render(<InstallPrompt />);

    act(() => {
      fireInstallPrompt();
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays hidden when already running as an installed app', () => {
    window.matchMedia = makeMatchMedia(true);

    render(<InstallPrompt />);

    act(() => {
      fireInstallPrompt();
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
