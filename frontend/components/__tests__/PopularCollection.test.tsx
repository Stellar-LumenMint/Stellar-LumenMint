import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (p: any) => <img {...p} alt={p.alt} />,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: any) => <span>{children}</span>,
}));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('@/lib/telemetry/navigation-instrumentation', () => ({
  emitCtaClicked: jest.fn(),
  CTA_IDS: { EXPLORE_MORE_POPULAR_COLLECTION: 'explore-more' },
  CTA_PLACEMENTS: { LANDING_HERO_PRIMARY: 'landing' },
  normalizeRoute: (r: string) => r,
}));
jest.mock('@/hooks/graphql/useCollectionQueries', () => ({
  usePopularCollectionsQuery: jest.fn(() => ({
    data: {
      topCollections: [
        {
          id: 'col-1',
          title: 'Popular Art',
          creatorName: 'Creator',
          creatorImage: '/creator.png',
          images: { main: '/main.png', secondary1: '/s1.png', secondary2: '/s2.png' },
          likes: 5,
          totalVolume: '5000',
        },
      ],
    },
    loading: false,
    error: undefined,
    refetch: jest.fn(),
  })),
  useLikeCollection: jest.fn(() => ({
    isLiked: false,
    likesCount: 5,
    isLoading: false,
    toggleLike: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

import PopularCollection from '../PopularCollection';

describe('PopularCollection component', () => {
  it('renders collection title from query data', () => {
    render(<PopularCollection />);
    expect(screen.getByText('Popular Art')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<PopularCollection title="Trending Now" />);
    expect(screen.getByText('Trending Now')).toBeInTheDocument();
  });
});
