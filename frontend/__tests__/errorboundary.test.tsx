import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <span>{children}</span> }));
jest.mock('../components/ui/button', () => ({ Button: ({ children, ...p }: any) => <button {...p}>{children}</button> }));

import ErrorBoundary from '../components/ErrorBoundary';

const ThrowError = () => { throw new Error('Test crash'); };

describe('ErrorBoundary component', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders error fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows retry button in error state', () => {
    render(
      <ErrorBoundary showRetry>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows home link in error state', () => {
    render(
      <ErrorBoundary showHome>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });
});
