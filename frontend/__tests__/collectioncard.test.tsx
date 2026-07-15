import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <span>{children}</span> }));
jest.mock('next/image', () => ({ __esModule: true, default: (p: any) => <img {...p} alt={p.alt} /> }));

import { CollectionCard } from '../components/CollectionCard';

describe('CollectionCard component', () => {
  it('renders collection name', () => {
    render(
      <CollectionCard
        id="col-1"
        name="Cosmic Dragons"
        image="/test.png"
        floorPrice="50"
        volume="1000"
        itemCount={42}
      />
    );
    expect(screen.getByText('Cosmic Dragons')).toBeInTheDocument();
  });

  it('renders floor price', () => {
    render(
      <CollectionCard id="col-2" name="Test" image="/t.png" floorPrice="50" volume="1000" itemCount={10} />
    );
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });
});
