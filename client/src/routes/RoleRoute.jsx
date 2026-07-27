import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';

function RoleRoute({ roles }) {
  const auth = useAuth();
  const allowed = roles.some((role) => auth.user?.roles?.includes(role));
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default RoleRoute;
