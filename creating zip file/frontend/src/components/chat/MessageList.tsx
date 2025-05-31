import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import MessageReactions from './MessageReactions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface Message {
  id: string;
  content: string;
  content_type: 'text' | 'image';
  media_url: string | null;
  sender: {
    id: string;
    username: string;
  };
  created_at: string;
  reactions: Array<{
    user_id: string;
    reaction: string;
  }>;
}

interface MessageListProps {
  messages: Message[];
}

interface AuthStore {
  user: { id: string } | null;
  token: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuthStore() as AuthStore;
  const queryClient = useQueryClient();

  const addReaction = useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: string; reaction: string }) => {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/messages/${messageId}/reactions`,
        { reaction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const removeReaction = useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: string; reaction: string }) => {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/messages/${messageId}/reactions/${reaction}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message: Message) => {
        const isOwnMessage = message.sender.id === user?.id;

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] ${
                isOwnMessage
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              } rounded-lg p-3`}
            >
              {!isOwnMessage && (
                <div className="text-sm font-medium text-gray-500 mb-1">
                  {message.sender.username}
                </div>
              )}
              
              {message.content_type === 'text' ? (
                <div className="break-words">{message.content}</div>
              ) : (
                <img
                  src={message.media_url || ''}
                  alt="Message attachment"
                  className="max-w-full rounded"
                />
              )}

              <div className="text-xs mt-1 text-gray-400">
                {format(new Date(message.created_at), 'HH:mm')}
              </div>

              <MessageReactions
                messageId={message.id}
                reactions={message.reactions}
                onAddReaction={(messageId: string, reaction: string) =>
                  addReaction.mutate({ messageId, reaction })
                }
                onRemoveReaction={(messageId: string, reaction: string) =>
                  removeReaction.mutate({ messageId, reaction })
                }
              />
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 