# Mobile Navigation

React Navigation 7 stack-based navigation for the LumenMint mobile app.

## Navigation Structure

```
RootNavigation
├── AuthNavigator (unauthenticated)
│   ├── EmailLoginScreen
│   ├── EmailRegisterScreen
│   ├── WalletImportScreen
│   └── WalletCreateScreen
│
└── AppNavigator (authenticated)
    ├── MarketplaceScreen
    ├── ExploreScreen
    ├── NFTDetailScreen (nft/:nftId)
    ├── CollectionDetailScreen (collection/:collectionId)
    ├── CreatorProfileScreen (creator/:creatorId)
    ├── VaultScreen
    └── SettingsScreen
```

## Deep Links

| Pattern | Screen |
|---|---|
| `nft/:nftId` | NFTDetailScreen |
| `collection/:collectionId` | CollectionDetailScreen |
| `creator/:creatorId` | CreatorProfileScreen |
| `auth/reset-password/:token` | ResetPasswordScreen |
| `auth/verify-email/:token` | VerifyEmailScreen |

## Auth Guard

`AppNavigator` is only accessible when authenticated. `AuthNavigator` is shown for unauthenticated users. Navigation between the two is handled automatically via the auth store.
