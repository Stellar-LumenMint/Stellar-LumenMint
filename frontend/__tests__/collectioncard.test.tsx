import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: any) => <span>{children}</span>,
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (p: any) => <img {...p} alt={p.alt} />,
}));
jest.mock('@/hooks/graphql/useCollectionQueries', () => ({
  useLikeCollection: () => ({
    isLiked: false,
    likesCount: 10,
    isLoading: false,
    toggleLike: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

import CollectionCard from '../components/CollectionCard';

const baseCollection = {
  id: 'col-1',
  title: 'Cosmic Dragons',
  creatorName: 'Creator',
  creatorImage: '/creator.png',
  images: {
    main: '/main.png',
    secondary1: '/s1.png',
    secondary2: '/s2.png',
  },
  likes: 10,
  totalVolume: '1000',
  floorPrice: '50',
};

describe('CollectionCard component', () => {
  it('renders collection title', () => {
    render(<CollectionCard collection={baseCollection} />);
    expect(screen.getByText('Cosmic Dragons')).toBeInTheDocument();
  });

  it('renders creator name', () => {
    render(<CollectionCard collection={baseCollection} />);
    expect(screen.getByText('Creator')).toBeInTheDocument();
  });

  it('renders the like count', () => {
    render(<CollectionCard collection={baseCollection} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
