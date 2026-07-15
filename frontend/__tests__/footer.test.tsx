import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
jest.mock('../components/image', () => ({ OptimizedImage: (p: any) => <img {...p} /> }));
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (k: string) => k, locale: 'en' }) }));

import Footer from '../components/Footer';

describe('Footer component', () => {
  it('renders brand logo', () => {
    render(<Footer />);
    expect(screen.getByAltText('Stellar-LumenMint')).toBeInTheDocument();
  });

  it('renders platform links', () => {
    render(<Footer />);
    expect(screen.getByText('navigation.marketplace')).toBeInTheDocument();
    expect(screen.getByText('navigation.explore')).toBeInTheDocument();
  });

  it('renders copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('renders scroll-to-top button', () => {
    render(<Footer />);
    expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();
  });
});
