import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AuthContext from '../contexts/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

function renderRoute(authValue) {
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<h1>Login page</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<h1>Protected dashboard</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const baseAuth = {
  isLoading: false,
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
};

describe('ProtectedRoute', () => {
  it('redirects guests to login', () => {
    renderRoute(baseAuth);
    expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument();
  });

  it('renders protected content for authenticated users', () => {
    renderRoute({ ...baseAuth, isAuthenticated: true, user: { id: 'user-1' } });
    expect(
      screen.getByRole('heading', { name: 'Protected dashboard' }),
    ).toBeInTheDocument();
  });
});
