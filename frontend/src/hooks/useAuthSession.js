import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';

export function useAuthSession() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authResolved = useAuthStore((state) => state.authResolved);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  useEffect(() => {
    const handleExpired = () => {
      navigate('/login', {
        replace: true,
        state: { reason: 'session-expired' },
      });
    };

    window.addEventListener('splitbill:auth-expired', handleExpired);

    return () => {
      window.removeEventListener('splitbill:auth-expired', handleExpired);
    };
  }, [navigate]);

  return {
    isAuthenticated,
    authResolved,
    isBootstrapping,
  };
}
