import { useEffect } from 'react';
import { Transition } from '@headlessui/react';

interface NotificationProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  autoHideDuration?: number;
}

const Notification = ({
  message,
  type = 'info',
  isVisible,
  onClose,
  autoHideDuration = 3000
}: NotificationProps) => {
  useEffect(() => {
    if (isVisible && autoHideDuration > 0) {
      const timer = setTimeout(onClose, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDuration, onClose]);

  const bgColorClass = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-indigo-500'
  }[type];

  return (
    <Transition
      show={isVisible}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`${bgColorClass} text-white px-4 py-3 rounded-lg shadow-lg`}>
          <div className="flex items-center">
            <p className="text-sm font-medium">{message}</p>
            <button
              onClick={onClose}
              className="ml-4 text-white hover:text-gray-100 focus:outline-none"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </Transition>
  );
};

export default Notification; 