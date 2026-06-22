import { useEffect } from 'react';

import { getCurrentUser, refreshAccessToken } from '../api/auth';
import { authStore } from '../stores/authStore';

export function useAuthBootstrap() {
  useEffect(() => {
    const state = authStore.getState();

    if (state.authResolved || state.isBootstrapping) {
      return;
    }

    async function bootstrap() {
      authStore.getState().startBootstrap();

      try {
        const refreshData = await refreshAccessToken();
        const accessToken = refreshData?.access_token;

        if (!accessToken) {
          throw new Error('Missing refreshed access token');
        }

        authStore.getState().setAccessToken(accessToken);

        const user = await getCurrentUser();

        authStore.getState().setSession({
          user,
          accessToken,
          displayNameRequired: Boolean(!user?.display_name),
        });
      } catch {
        authStore.getState().clearSession();
      } finally {
        authStore.getState().finishBootstrap();
      }
    }

    bootstrap();
  }, []);
}
