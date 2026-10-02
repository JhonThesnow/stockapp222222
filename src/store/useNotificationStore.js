import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  latestNotification: null,
  timeoutId: null,

  addNotification: (message, type = 'info') => {
    const newNotification = { id: Date.now(), message, type, timestamp: new Date() };

    // Clear any existing timeout to restart the 3-second window
    const currentTimeout = get().timeoutId;
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }

    set((state) => {
      // If there was a previous notification still showing, we assume it counts as unread
      // when it's replaced. However, we won't increment it immediately here. We'll only increment
      // when the timeout finishes to keep the counter accurate without double counting.
      // Actually, if we overwrite it before 3 seconds, the previous one was never "finished" displaying.
      // We will increment unreadCount for the overwritten one.
      const incrementUnread = state.latestNotification ? 1 : 0;

      return {
        notifications: [...state.notifications, newNotification],
        latestNotification: { message, type },
        unreadCount: state.unreadCount + incrementUnread
      };
    });

    const timeoutId = setTimeout(() => {
      set((state) => ({
        latestNotification: null,
        unreadCount: state.unreadCount + 1,
        timeoutId: null
      }));
    }, 3000);

    set({ timeoutId });
  },

  markAllAsRead: () => {
    set({ unreadCount: 0 });
  }
}));

export default useNotificationStore;
