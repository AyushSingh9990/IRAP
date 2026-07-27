import { Navigate, Outlet } from 'react-router-dom';
import Loader from '../components/common/Loader/Loader.jsx';
import useAuth from '../hooks/useAuth.js';

function PublicOnlyRoute() {
  const auth = useAuth();
  if (auth.isLoading) {
    return <div className="route-loader"><Loader label="Checking account" size="large" /></div>;
  }
  return auth.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export default PublicOnlyRoute;
