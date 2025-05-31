import React from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import Notification from './Notification';

interface NotificationData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  autoHideDuration?: number;
}

const NotificationList: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map((notification: NotificationData) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          isVisible={true}
          onClose={() => removeNotification(notification.id)}
          autoHideDuration={notification.autoHideDuration}
        />
      ))}
    </div>
  );
};

export default NotificationList; 