# Auth Screens

Wallet authentication and account management screens for the LumenMint mobile app.

## Screens

### WalletImportScreen
Import an existing Stellar wallet using a secret key or 12/24-word recovery phrase.

- **Input methods**: Secret key (starts with `S`) or mnemonic phrase
- **Validation**: Real-time key/phrase validation with visual feedback
- **Security**: Optional encryption password for wallet storage

### WalletCreateScreen
Generate a new Stellar wallet with secure key pair and recovery phrase.

- **Generation**: Creates wallet via `stellarWalletService.createWallet()`
- **Recovery phrase**: 12-word BIP39 mnemonic with copy-to-clipboard
- **Confirmation**: Requires user to confirm the mnemonic before proceeding
- **Encryption**: Optional password for secure on-device storage

### EmailLoginScreen
Sign in with email and password credentials.

### EmailRegisterScreen
Create a new account with email, username, and password.

## Components

| Component | Purpose |
|---|---|
| `SecretKeyInput` | Validated secret key input with format checking |
| `MnemonicDisplay` | Secure mnemonic phrase display with copy support |
| `MnemonicConfirmation` | Mnemonic verification step before wallet creation |
| `FormInput` | Reusable form input with validation and error states |
