/**
 * Deep Link Configuration for React Navigation.
 *
 * Maps URL paths to screen names in the navigation tree so that
 * external links (e.g., stellar-lumenmint://nft/abc123) open the
 * correct screen within the app.
 *
 * Supported schemes:
 *   - stellar-lumenmint://  (custom scheme)
 *   - https://stellar-lumenmint.com  (universal link, iOS)
 *   - https://stellar-lumenmint.com  (app link, Android)
 */

import type { LinkingOptions } from "@react-navigation/native";

export const deepLinkConfig: LinkingOptions<Record<string, unknown>> = {
  prefixes: [
    "stellar-lumenmint://",
    "https://stellar-lumenmint.com",
    "https://www.stellar-lumenmint.com",
  ],
  config: {
    screens: {
      // Auth screens
      Onboarding: "onboarding",
      WalletSelection: "wallet/select",
      WalletCreate: "wallet/create",
      WalletImport: "wallet/import",
      EmailLogin: "auth/login",
      EmailRegister: "auth/register",

      // Main app screens
      Home: "",
      Marketplace: "marketplace",
      Profile: "profile",

      // Deep-linked content
      NFTDetail: "nft/:nftId",
      CollectionDetail: "collection/:collectionId",
      CreatorProfile: "creator/:creatorId",

      // Auth actions
      ResetPassword: "auth/reset-password/:token",
      VerifyEmail: "auth/verify-email/:token",
    },
  },
};

/**
 * Extract the target screen and params from a deep link URL.
 */
export function parseDeepLink(url: string): {
  screen: string;
  params: Record<string, string>;
} | null {
  try {
    const parsed = new URL(url);

    // Handle custom scheme
    if (parsed.protocol === "stellar-lumenmint:") {
      const path = parsed.host + parsed.pathname;
      return routeToScreen(path);
    }

    // Handle universal / app links
    if (
      parsed.hostname === "stellar-lumenmint.com" ||
      parsed.hostname === "www.stellar-lumenmint.com"
    ) {
      return routeToScreen(parsed.pathname);
    }

    return null;
  } catch {
    return null;
  }
}

function routeToScreen(path: string): {
  screen: string;
  params: Record<string, string>;
} | null {
  // Normalize the path
  const cleanPath = path.replace(/^\/+|\/+$/g, "");

  // Static route mapping
  const staticRoutes: Record<string, string> = {
    "": "Home",
    marketplace: "Marketplace",
    profile: "Profile",
    onboarding: "Onboarding",
    "wallet/select": "WalletSelection",
    "wallet/create": "WalletCreate",
    "wallet/import": "WalletImport",
    "auth/login": "EmailLogin",
    "auth/register": "EmailRegister",
  };

  const screen = staticRoutes[cleanPath];
  if (screen) return { screen, params: {} };

  // Dynamic routes
  const nftMatch = cleanPath.match(/^nft\/(.+)$/);
  if (nftMatch)
    return { screen: "NFTDetail", params: { nftId: nftMatch[1] } };

  const collectionMatch = cleanPath.match(/^collection\/(.+)$/);
  if (collectionMatch)
    return { screen: "CollectionDetail", params: { collectionId: collectionMatch[1] } };

  const creatorMatch = cleanPath.match(/^creator\/(.+)$/);
  if (creatorMatch)
    return { screen: "CreatorProfile", params: { creatorId: creatorMatch[1] } };

  const resetMatch = cleanPath.match(/^auth\/reset-password\/(.+)$/);
  if (resetMatch)
    return { screen: "ResetPassword", params: { token: resetMatch[1] } };

  const verifyMatch = cleanPath.match(/^auth\/verify-email\/(.+)$/);
  if (verifyMatch)
    return { screen: "VerifyEmail", params: { token: verifyMatch[1] } };

  return null;
}
