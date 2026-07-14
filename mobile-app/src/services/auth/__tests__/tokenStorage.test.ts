import { TokenStorage } from "../tokenStorage";

describe("TokenStorage", () => {
  let storage: TokenStorage;

  beforeEach(() => {
    storage = new TokenStorage();
    jest.clearAllMocks();
  });

  it("saves access and refresh tokens to SecureStore", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.setItemAsync.mockResolvedValue(undefined);

    await storage.saveTokens("access-token-123", "refresh-token-456");

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "stellar_lumenmint_access_token",
      "access-token-123",
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "stellar_lumenmint_refresh_token",
      "refresh-token-456",
    );
  });

  it("retrieves access token from SecureStore", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.getItemAsync.mockResolvedValue("access-token-123");

    const token = await storage.getAccessToken();
    expect(token).toBe("access-token-123");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      "stellar_lumenmint_access_token",
    );
  });

  it("returns null when access token is not stored", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.getItemAsync.mockResolvedValue(null);

    const token = await storage.getAccessToken();
    expect(token).toBeNull();
  });

  it("retrieves refresh token from SecureStore", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.getItemAsync.mockResolvedValue("refresh-token-456");

    const token = await storage.getRefreshToken();
    expect(token).toBe("refresh-token-456");
  });

  it("clears both tokens from SecureStore", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.deleteItemAsync.mockResolvedValue(undefined);

    await storage.clearTokens();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "stellar_lumenmint_access_token",
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "stellar_lumenmint_refresh_token",
    );
  });

  it("re-throws SecureStore errors on save", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.setItemAsync.mockRejectedValue(new Error("storage full"));

    await expect(
      storage.saveTokens("a", "b"),
    ).rejects.toThrow("storage full");
  });

  it("re-throws SecureStore errors on clear", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.deleteItemAsync.mockRejectedValue(new Error("delete failed"));

    await expect(storage.clearTokens()).rejects.toThrow("delete failed");
  });
});
