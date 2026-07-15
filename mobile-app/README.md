# LumenMint Mobile App

React Native mobile application for Stellar-based NFT marketplace. Built with Expo, Zustand state management, and Stellar SDK integration.

## Quick Start

```bash
cd mobile-app
pnpm install
npx expo start
```

## Architecture

```
src/
├── screens/       # Screen components (auth, marketplace, profile)
├── services/      # Service layer (auth, stellar, wallet)
├── stores/        # Zustand state management
├── hooks/         # Custom React hooks
├── components/    # Shared UI components
├── navigation/    # React Navigation config
├── constants/     # Theme, config constants
└── types/         # TypeScript type definitions
```

## Key Technologies

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 |
| State | Zustand 5 |
| Navigation | React Navigation 7 |
| Blockchain | Stellar SDK 12 |
| Storage | expo-secure-store |
| Testing | Jest 29 |

## Testing

```bash
pnpm test
```

Tests use Jest with mocked `expo-secure-store` and `@react-native-async-storage/async-storage`.
