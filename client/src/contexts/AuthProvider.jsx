import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCurrentAccount,
  loginAccount,
  logoutAccount,
  verifyTwoFactorLogin,
} from '../api/authApi.js';
import AuthContext from './AuthContext.jsx';

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [serviceAvailable, setServiceAvailable] = useState(true);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await getCurrentAccount();
      setUser(result.data.user);
      setServiceAvailable(true);
      setStatus('authenticated');
    } catch (error) {
      setUser(null);
      setServiceAvailable(error?.response?.status !== 503);
      setStatus('guest');
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (credentials) => {
    const result = await loginAccount(credentials);
    if (!result.data?.requiresTwoFactor) {
      setUser(result.data.user);
      setServiceAvailable(true);
      setStatus('authenticated');
    }
    return result;
  }, []);

  const completeTwoFactor = useCallback(async (payload) => {
    const result = await verifyTwoFactorLogin(payload);
    setUser(result.data.user);
    setServiceAvailable(true);
    setStatus('authenticated');
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAccount();
    } catch {
      // Local logout still completes when the API is temporarily unreachable.
    } finally {
      setUser(null);
      setStatus('guest');
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      serviceAvailable,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      completeTwoFactor,
      logout,
      refreshAccount: bootstrap,
      hasRole: (role) => Boolean(user?.roles?.includes(role)),
      hasPermission: (permission) =>
        Boolean(user?.permissions?.includes(permission)),
    }),
    [bootstrap, completeTwoFactor, login, logout, serviceAvailable, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
