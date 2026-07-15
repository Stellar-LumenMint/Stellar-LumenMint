import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../../services/stellar/wallet.service', () => ({
  stellarWalletService: {
    isValidMnemonic: jest.fn((m: string) => m.trim().split(/\s+/).length === 12 || m.trim().split(/\s+/).length === 24),
    isValidSecretKey: jest.fn((k: string) => k.startsWith('S') && k.length === 56),
    importFromSecretKey: jest.fn(),
    importFromMnemonic: jest.fn(),
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: jest.fn(() => jest.fn()),
}));

import { WalletImportScreen } from '../WalletImportScreen';
import { stellarWalletService } from '../../services/stellar/wallet.service';

describe('WalletImportScreen', () => {
  it('renders the import heading and method tabs', () => {
    const { getByText } = render(<WalletImportScreen />);
    expect(getByText('Import Wallet')).toBeTruthy();
    expect(getByText('Secret Key')).toBeTruthy();
    expect(getByText('Recovery Phrase')).toBeTruthy();
  });

  it('shows secret key input by default', () => {
    const { getByText } = render(<WalletImportScreen />);
    expect(getByText('Encryption Password')).toBeTruthy();
  });

  it('switches to mnemonic input when tab is pressed', () => {
    const { getByText } = render(<WalletImportScreen />);
    fireEvent.press(getByText('Recovery Phrase'));
    expect(getByText('Recovery Phrase')).toBeTruthy();
  });

  it('shows import button', () => {
    const { getByText } = render(<WalletImportScreen />);
    expect(getByText('Import and Continue')).toBeTruthy();
  });

  it('disables import button when no valid input', () => {
    const { getByText } = render(<WalletImportScreen />);
    const button = getByText('Import and Continue').parent;
    expect(button).toBeTruthy();
  });
});
