import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/image', () => ({ __esModule: true, default: (p: any) => <img {...p} alt={p.alt} /> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <span>{children}</span> }));

import { PopularCollection } from '../PopularCollection';

describe('PopularCollection component', () => {
  it('renders collection name', () => {
    render(
      <PopularCollection
        id="col-1"
        name="Popular Art"
        image="/art.png"
        volume="5000"
      />
    );
    expect(screen.getByText('Popular Art')).toBeInTheDocument();
  });

  it('renders volume', () => {
    render(
      <PopularCollection id="col-2" name="Test" image="/t.png" volume="5000" />
    );
    expect(screen.getByText(/5000/)).toBeInTheDocument();
  });
});
