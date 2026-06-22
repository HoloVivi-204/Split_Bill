import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../stores/authStore';

export function DisplayNameRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const displayNameRequired = useAuthStore((state) => state.displayNameRequired);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!displayNameRequired) {
    return <Navigate to="/groups" replace />;
  }

  return <Outlet />;
}
