import { create } from 'zustand';
import { StateCreator } from 'zustand';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  autoHideDuration?: number;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

type NotificationStoreCreator = StateCreator<NotificationStore>;

export const useNotificationStore = create<NotificationStore>((set: (fn: (state: NotificationStore) => NotificationStore) => void) => ({
  notifications: [],
  addNotification: (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    set((state: NotificationStore) => ({
      notifications: [...state.notifications, { ...notification, id }]
    }));
  },
  removeNotification: (id: string) => {
    set((state: NotificationStore) => ({
      notifications: state.notifications.filter((n: Notification) => n.id !== id)
    }));
  }
})); 