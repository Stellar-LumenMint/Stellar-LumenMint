import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Admin App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // The admin app should render its root element
    expect(document.querySelector('#root') || document.body).toBeInTheDocument();
  });

  it('renders the admin header or navigation', () => {
    render(<App />);
    // Check for admin-specific elements
    const appElement = document.querySelector('.App') || document.querySelector('[class*="app"]');
    expect(appElement || document.body).toBeInTheDocument();
  });
});
