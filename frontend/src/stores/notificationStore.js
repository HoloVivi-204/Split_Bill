import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

const initialState = {
  items: [],
  unreadCount: 0,
  page: 1,
  total: 0,
  hasMore: false,
};

export const notificationStore = createStore((set) => ({
  ...initialState,
  setNotificationSnapshot: ({ items, unreadCount = 0, page = 1, total = 0, hasMore = false }) =>
    set({
      items,
      unreadCount,
      page,
      total,
      hasMore,
    }),
  prependNotification: (notification) =>
    set((state) => ({
      ...state,
      items: [notification, ...state.items.filter((item) => item.id !== notification.id)],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
      total: state.total + 1,
    })),
  markOneRead: (notificationId) =>
    set((state) => {
      let changed = false;
      const items = state.items.map((item) => {
        if (item.id !== notificationId || item.is_read) {
          return item;
        }

        changed = true;
        return {
          ...item,
          is_read: true,
        };
      });

      return {
        ...state,
        items,
        unreadCount: changed ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),
  markAllRead: () =>
    set((state) => ({
      ...state,
      items: state.items.map((item) => ({
        ...item,
        is_read: true,
      })),
      unreadCount: 0,
    })),
  resetNotifications: () => set(initialState),
}));

export const useNotificationStore = (selector) => useStore(notificationStore, selector);
