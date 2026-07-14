import { act } from "@testing-library/react";
import { useAuthStore } from "./auth-store";

// NOTE: We test only synchronous state management methods here.
// Async methods (login, register, etc.) are tested in integration tests
// e.g., frontend/__tests__/email-login-flow.test.tsx

describe("Auth Store — synchronous methods", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({
        user: null,
        loading: false,
        isAuthenticated: false,
        error: null,
        accessToken: null,
        refreshTokenValue: null,
      });
    });
    localStorage.clear();
    sessionStorage.clear();
  });

  // ===========================================================================
  describe("getCurrentUser", () => {
    it("returns null when no user is stored", () => {
      const user = useAuthStore.getState().getCurrentUser();
      expect(user).toBeNull();
    });

    it("returns user from localStorage", () => {
      const mockUser = { id: "user-1", email: "test@example.com" };
      localStorage.setItem("auth-user", JSON.stringify({ data: mockUser }));

      const user = useAuthStore.getState().getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it("falls back to sessionStorage when localStorage is empty", () => {
      const mockUser = { id: "user-2", email: "session@example.com" };
      sessionStorage.setItem("auth-user", JSON.stringify({ data: mockUser }));

      const user = useAuthStore.getState().getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it("returns null when JSON parse fails", () => {
      localStorage.setItem("auth-user", "invalid-json{{{");

      const user = useAuthStore.getState().getCurrentUser();
      expect(user).toBeNull();
    });
  });

  // ===========================================================================
  describe("isAccessTokenExpired", () => {
    it("returns true when no token exists", () => {
      expect(useAuthStore.getState().isAccessTokenExpired()).toBe(true);
    });

    it("returns true when token is malformed", () => {
      localStorage.setItem("access_token", "not-a-jwt");
      expect(useAuthStore.getState().isAccessTokenExpired()).toBe(true);
    });

    it("returns true when token is expired", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = btoa(JSON.stringify({ exp: pastExp }));
      const token = `header.${payload}.signature`;
      localStorage.setItem("access_token", token);
      expect(useAuthStore.getState().isAccessTokenExpired()).toBe(true);
    });

    it("returns false when token is still valid", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = btoa(JSON.stringify({ exp: futureExp }));
      const token = `header.${payload}.signature`;
      localStorage.setItem("access_token", token);
      expect(useAuthStore.getState().isAccessTokenExpired()).toBe(false);
    });

    it("checks sessionStorage as fallback", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureExp }));
      const token = `header.${payload}.signature`;
      sessionStorage.setItem("access_token", token);
      expect(useAuthStore.getState().isAccessTokenExpired()).toBe(false);
    });
  });

  // ===========================================================================
  describe("setUser", () => {
    it("sets the user and marks as authenticated", () => {
      const user = { id: "user-1", email: "a@b.com" };
      act(() => {
        useAuthStore.getState().setUser(user as any);
      });
      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
    });

    it("sets null user and marks as unauthenticated", () => {
      act(() => {
        useAuthStore.getState().setUser(null);
      });
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ===========================================================================
  describe("setLoading", () => {
    it("updates loading state", () => {
      act(() => {
        useAuthStore.getState().setLoading(true);
      });
      expect(useAuthStore.getState().loading).toBe(true);

      act(() => {
        useAuthStore.getState().setLoading(false);
      });
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  // ===========================================================================
  describe("setError / clearError", () => {
    it("sets and clears the error state", () => {
      const error = {
        message: "Something failed",
        code: "ERR_TEST",
        statusCode: 500,
        severity: "error",
        retryable: false,
      };

      act(() => {
        useAuthStore.getState().setError(error);
      });
      expect(useAuthStore.getState().error).toEqual(error);

      act(() => {
        useAuthStore.getState().clearError();
      });
      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
