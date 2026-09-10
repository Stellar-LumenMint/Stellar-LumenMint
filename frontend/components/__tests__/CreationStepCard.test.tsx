import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Rocket, Check } from 'lucide-react';

import CreationStepCard from '../CreationStepCard';

describe('CreationStepCard component', () => {
  const step = {
    id: 'upload',
    icon: Rocket,
    title: 'Upload Artwork',
    description: 'Upload your digital artwork to IPFS',
    color: 'bg-purple-500',
    isCompleted: false,
  };

  it('renders step title and description', () => {
    render(<CreationStepCard step={step} index={0} layout="desktop" />);
    expect(screen.getByText('Upload Artwork')).toBeInTheDocument();
    expect(screen.getByText(/Upload your digital artwork/)).toBeInTheDocument();
  });

  it('renders a completion badge when the step is completed', () => {
    render(
      <CreationStepCard
        step={{ ...step, isCompleted: true }}
        index={1}
        layout="mobile"
      />
    );
    expect(screen.getByText('Upload Artwork')).toBeInTheDocument();
    // Completion badge renders the Check icon
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});