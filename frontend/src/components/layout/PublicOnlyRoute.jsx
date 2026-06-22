import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../stores/authStore';

export function PublicOnlyRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const displayNameRequired = useAuthStore((state) => state.displayNameRequired);
  const pendingRecoveryCodes = useAuthStore((state) => state.pendingRecoveryCodes);
  const returnPath = location.state?.from?.pathname;

  if (isAuthenticated) {
    if (location.pathname === '/register' && pendingRecoveryCodes.length > 0) {
      return <Outlet />;
    }

    if (displayNameRequired) {
      return <Navigate to="/onboarding/display-name" replace />;
    }

    return <Navigate to={returnPath || '/groups'} replace />;
  }

  return <Outlet />;
}
