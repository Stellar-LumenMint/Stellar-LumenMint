import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (k: string) => k, locale: 'en' }) }));

import { ResponsiveDemo } from '../components/ResponsiveDemo';

describe('ResponsiveDemo component', () => {
  it('renders without crashing', () => {
    render(<ResponsiveDemo />);
    expect(document.body).toBeInTheDocument();
  });
});
