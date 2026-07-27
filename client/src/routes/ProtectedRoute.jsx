import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from '../components/common/Loader/Loader.jsx';
import useAuth from '../hooks/useAuth.js';

function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <div className="route-loader"><Loader label="Checking account" size="large" /></div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
