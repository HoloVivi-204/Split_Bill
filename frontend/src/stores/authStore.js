import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  displayNameRequired: false,
  authResolved: false,
  isBootstrapping: false,
  pendingRecoveryCodes: [],
};

export const authStore = createStore((set) => ({
  ...initialState,
  setSession: ({ user, accessToken, displayNameRequired = false, pendingRecoveryCodes = [] }) =>
    set({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      displayNameRequired,
      authResolved: true,
      isBootstrapping: false,
      pendingRecoveryCodes,
    }),
  setAccessToken: (accessToken) =>
    set((state) => ({
      ...state,
      accessToken,
      isAuthenticated: Boolean(state.user && accessToken),
    })),
  updateUser: (user) =>
    set((state) => ({
      ...state,
      user,
      isAuthenticated: Boolean(user && state.accessToken),
      displayNameRequired: Boolean(!user?.display_name),
    })),
  startBootstrap: () =>
    set((state) => ({
      ...state,
      isBootstrapping: true,
    })),
  finishBootstrap: () =>
    set((state) => ({
      ...state,
      authResolved: true,
      isBootstrapping: false,
    })),
  setPendingRecoveryCodes: (pendingRecoveryCodes) =>
    set((state) => ({
      ...state,
      pendingRecoveryCodes,
    })),
  clearPendingRecoveryCodes: () =>
    set((state) => ({
      ...state,
      pendingRecoveryCodes: [],
    })),
  clearSession: () =>
    set({
      ...initialState,
      authResolved: true,
    }),
  resetAuthState: () => set(initialState),
}));

export const useAuthStore = (selector) => useStore(authStore, selector);
