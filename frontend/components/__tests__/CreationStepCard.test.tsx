import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CreationStepCard } from '../CreationStepCard';

describe('CreationStepCard component', () => {
  it('renders step title and description', () => {
    render(
      <CreationStepCard
        step={1}
        title="Upload Artwork"
        description="Upload your digital artwork to IPFS"
      />
    );
    expect(screen.getByText('Upload Artwork')).toBeInTheDocument();
    expect(screen.getByText(/Upload your digital artwork/)).toBeInTheDocument();
  });

  it('renders step number', () => {
    render(
      <CreationStepCard step={3} title="Mint NFT" description="Mint your NFT on Stellar" />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
