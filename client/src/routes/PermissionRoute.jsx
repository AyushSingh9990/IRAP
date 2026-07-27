import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';

function PermissionRoute({ permissions }) {
  const auth = useAuth();
  const allowed = permissions.every((permission) =>
    auth.user?.permissions?.includes(permission),
  );
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default PermissionRoute;
