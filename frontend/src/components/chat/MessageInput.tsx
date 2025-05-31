import React, { useState, useRef, useEffect } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import FileUpload from './FileUpload';

interface MessageInputProps {
  onSend: (data: { content: string; contentType: 'text' | 'image'; mediaUrl?: string | null }) => void;
  onTyping: () => void;
  isTyping: boolean;
}

interface NotificationStore {
  addNotification: (notification: { message: string; type: string; autoHideDuration?: number }) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, onTyping, isTyping }) => {
  const [message, setMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addNotification = useNotificationStore((state: NotificationStore) => state.addNotification);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    onSend({
      content: trimmedMessage,
      contentType: 'text'
    });
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping();
  };

  const handleFileUploadComplete = (mediaUrl: string) => {
    onSend({
      content: 'Image',
      contentType: 'image',
      mediaUrl
    });
  };

  const handleFileUploadError = (error: string) => {
    addNotification({
      message: error,
      type: 'error',
      autoHideDuration: 3000
    });
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full p-3 pr-12 rounded-lg border focus:outline-none focus:border-indigo-500 resize-none"
            rows={1}
          />
          <div className="absolute right-2 bottom-2">
            <FileUpload
              onUploadComplete={handleFileUploadComplete}
              onError={handleFileUploadError}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!message.trim()}
          className={`px-4 py-2 rounded-lg ${
            message.trim()
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Send
        </button>
      </div>
      {isTyping && (
        <div className="text-xs text-gray-500 mt-1">
          You are typing...
        </div>
      )}
    </form>
  );
};

export default MessageInput; 