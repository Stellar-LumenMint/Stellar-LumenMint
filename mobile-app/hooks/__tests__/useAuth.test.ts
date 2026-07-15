import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';

jest.mock('../../stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    user: { id: '1', email: 'test@test.com', username: 'test' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    loginWithEmail: jest.fn(),
    loginWithWallet: jest.fn(),
    registerWithEmail: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn().mockResolvedValue(true),
  })),
}));

describe('useAuth hook', () => {
  it('returns auth state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
  });

  it('provides login and logout methods', () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.loginWithEmail).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});
