import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AuthContext from '../contexts/AuthContext.jsx';
import PersonalWorkspaceRoute from './PersonalWorkspaceRoute.jsx';

function renderRoute(user) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading: false,
      }}
    >
      <MemoryRouter initialEntries={['/dashboard/applications']}>
        <Routes>
          <Route element={<PersonalWorkspaceRoute />}>
            <Route
              path="/dashboard/applications"
              element={<div>Personal applications</div>}
            />
          </Route>
          <Route path="/admin" element={<div>Admin workspace</div>} />
          <Route
            path="/dashboard/account"
            element={<div>Account settings</div>}
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('PersonalWorkspaceRoute', () => {
  it('redirects an administrative-only account away from applicant applications', () => {
    renderRoute({
      roles: ['super_admin'],
      requestedJourneys: [],
      permissions: ['application:review'],
    });

    expect(screen.getByText('Admin workspace')).toBeInTheDocument();
    expect(screen.queryByText('Personal applications')).not.toBeInTheDocument();
  });

  it('allows an account with a personal journey to use applicant applications', () => {
    renderRoute({
      roles: ['member'],
      requestedJourneys: ['member'],
      permissions: [],
    });

    expect(screen.getByText('Personal applications')).toBeInTheDocument();
  });
});
