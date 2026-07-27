import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import {
  getAdministrativeDestination,
  hasPersonalJourney,
} from '../utils/dashboardAccess.js';

function PersonalWorkspaceRoute() {
  const auth = useAuth();

  if (hasPersonalJourney(auth.user)) {
    return <Outlet />;
  }

  return (
    <Navigate
      to={getAdministrativeDestination(auth.user) || '/dashboard/account'}
      replace
    />
  );
}

export default PersonalWorkspaceRoute;
