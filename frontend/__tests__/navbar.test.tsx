import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navbar } from '../navbar';

// Mock dependencies
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

jest.mock('../image', () => ({
  OptimizedImage: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock('@/components/ui/modern-search-input', () => ({
  ModernSearchInput: ({ placeholder }: any) => (
    <input data-testid="search-input" placeholder={placeholder} />
  ),
}));

jest.mock('@/components/wallet/WalletConnector', () => ({
  WalletConnector: ({ fullWidth }: any) => (
    <button data-testid="wallet-connector">Connect Wallet</button>
  ),
}));

jest.mock('../user-dropdown', () => ({
  UserDropdown: () => <div data-testid="user-dropdown">User Menu</div>,
}));

jest.mock('../account-entry-menu', () => ({
  AccountEntryMenu: () => <button data-testid="account-menu">Sign In</button>,
}));

jest.mock('../LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
  MobileLanguageSwitcher: () => <div data-testid="mobile-language-switcher" />,
}));

jest.mock('@/lib/stores/auth-store', () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}));

jest.mock('@/lib/telemetry/navigation-instrumentation', () => ({
  emitNavItemClicked: jest.fn(),
  NAV_ITEM_IDS: {
    HOME: 'home',
    EXPLORE: 'explore',
    MARKETPLACE: 'marketplace',
    ARTISTS: 'artists',
    VAULT: 'vault',
    CREATE: 'create',
    COLLECTIONS: 'collections',
    ACTIVITY: 'activity',
  },
  NAV_PLACEMENTS: {
    NAVBAR_DESKTOP: 'navbar_desktop',
    NAVBAR_MOBILE_DRAWER: 'navbar_mobile_drawer',
  },
  normalizeRoute: (route: string) => route,
}));

describe('Navbar component', () => {
  it('renders the logo and navigation links', () => {
    render(<Navbar />);
    expect(screen.getByAltText('Stellar-LumenMint')).toBeInTheDocument();
    expect(screen.getByText('navigation.explore')).toBeInTheDocument();
    expect(screen.getByText('navigation.marketplace')).toBeInTheDocument();
  });

  it('renders wallet connector when not authenticated', () => {
    render(<Navbar />);
    expect(screen.getByTestId('wallet-connector')).toBeInTheDocument();
    expect(screen.getByTestId('account-menu')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<Navbar />);
    const searchInputs = screen.getAllByTestId('search-input');
    expect(searchInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders mobile hamburger button', () => {
    render(<Navbar />);
    const hamburger = screen.getByLabelText('Open navigation menu');
    expect(hamburger).toBeInTheDocument();
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });
});
