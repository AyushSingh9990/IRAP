import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AuthContext from '../contexts/AuthContext.jsx';
import PermissionRoute from './PermissionRoute.jsx';

function renderPermissionRoute(permissions) {
  render(
    <AuthContext.Provider value={{ user: { permissions }, isAuthenticated: true, isLoading: false }}>
      <MemoryRouter initialEntries={['/admin/secure']}>
        <Routes>
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
          <Route element={<PermissionRoute permissions={['audit:read']} />}>
            <Route path="/admin/secure" element={<h1>Audit log</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('PermissionRoute', () => {
  it('renders content when every required permission is assigned', () => {
    renderPermissionRoute(['audit:read']);
    expect(screen.getByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
  });

  it('redirects users who do not have the required permission', () => {
    renderPermissionRoute([]);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });
});
