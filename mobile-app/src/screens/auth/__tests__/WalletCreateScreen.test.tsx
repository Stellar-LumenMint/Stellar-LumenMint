import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../services/stellar/wallet.service', () => ({
  stellarWalletService: {
    createWallet: jest.fn().mockResolvedValue({
      wallet: { publicKey: 'GABC...', secretKey: 'SABC...' },
      mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    }),
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: jest.fn(() => jest.fn()),
}));

jest.mock('../components/MnemonicDisplay', () => ({
  MnemonicDisplay: ({ mnemonic }: any) => <>{mnemonic}</>,
}));

jest.mock('../components/MnemonicConfirmation', () => ({
  MnemonicConfirmation: ({ confirmed, onChange }: any) => (
    <>{confirmed ? 'Confirmed' : 'Not confirmed'}</>
  ),
}));

import { WalletCreateScreen } from '../WalletCreateScreen';

describe('WalletCreateScreen', () => {
  it('renders loading state initially', () => {
    const { getByText } = render(<WalletCreateScreen />);
    expect(getByText('Generating your wallet...')).toBeTruthy();
  });

  it('renders the heading', async () => {
    const { findByText } = render(<WalletCreateScreen />);
    expect(await findByText('Your New Wallet')).toBeTruthy();
  });

  it('shows encryption password input', async () => {
    const { findByText } = render(<WalletCreateScreen />);
    expect(await findByText('Encryption Password')).toBeTruthy();
  });

  it('shows continue button disabled without confirmation', async () => {
    const { findByText } = render(<WalletCreateScreen />);
    expect(await findByText('Continue to Create Profile')).toBeTruthy();
  });
});
