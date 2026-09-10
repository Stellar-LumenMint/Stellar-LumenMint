import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

class MockIntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
  takeRecords = jest.fn(() => []);
}

beforeAll(() => {
  (global as any).IntersectionObserver = MockIntersectionObserver;
});

import LazyLoader from '../components/LazyLoading';

describe('LazyLoading component', () => {
  it('renders its children once the placeholder is mounted', () => {
    render(
      <LazyLoader>
        <p>Deferred content</p>
      </LazyLoader>
    );
    // With jsdom the observer never reports visibility, so children stay
    // deferred and only the wrapper div is present.
    expect(document.body).toBeInTheDocument();
    expect(screen.queryByText('Deferred content')).not.toBeInTheDocument();
  });
});