import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockSetTheme = jest.fn();
let mockThemeMode = 'dark';

jest.mock('@/lib/stores/preferences-store', () => ({
  useTheme: () => ({
    theme: { mode: mockThemeMode },
    setTheme: mockSetTheme,
  }),
}));

import { ThemeToggle } from '../components/ThemeToggle';

describe('ThemeToggle component', () => {
  beforeEach(() => {
    mockThemeMode = 'dark';
    mockSetTheme.mockClear();
  });

  it('renders sun icon in dark mode', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('calls setTheme with light mode when clicked in dark mode', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith({ mode: 'light' });
  });

  it('calls setTheme with dark mode when clicked in light mode', () => {
    mockThemeMode = 'light';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith({ mode: 'dark' });
  });
});
