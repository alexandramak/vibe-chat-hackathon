import React, { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';

interface MessageTimestampProps {
  timestamp: string;
  className?: string;
}

const MessageTimestamp: React.FC<MessageTimestampProps> = ({ timestamp, className = '' }) => {
  const [relativeTime, setRelativeTime] = useState<string>('');
  const [showAbsolute, setShowAbsolute] = useState<boolean>(false);

  useEffect(() => {
    const updateRelativeTime = () => {
      const date = new Date(timestamp);
      setRelativeTime(formatDistanceToNow(date, { addSuffix: true }));
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp]);

  const toggleTimeFormat = () => {
    setShowAbsolute(!showAbsolute);
  };

  const getAbsoluteTime = () => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isThisYear = date.getFullYear() === today.getFullYear();

    if (isToday) {
      return format(date, 'HH:mm');
    } else if (isThisYear) {
      return format(date, 'MMM d, HH:mm');
    } else {
      return format(date, 'MMM d, yyyy HH:mm');
    }
  };

  return (
    <button
      onClick={toggleTimeFormat}
      className={`text-xs hover:underline ${className}`}
      title={showAbsolute ? relativeTime : getAbsoluteTime()}
    >
      {showAbsolute ? getAbsoluteTime() : relativeTime}
    </button>
  );
};

export default MessageTimestamp; 