import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (k: string) => k, locale: 'en' }) }));

import { InstallPrompt } from '../components/InstallPrompt';

describe('InstallPrompt component', () => {
  it('renders without crashing', () => {
    render(<InstallPrompt />);
    expect(document.body).toBeInTheDocument();
  });
});
