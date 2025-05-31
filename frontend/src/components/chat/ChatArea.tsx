import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { LoadingSpinner, ErrorMessage } from '../common';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';

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

interface TypingUser {
  id: string;
  username: string;
}

const ChatArea = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { token, user } = useAuthStore();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error } = useQuery<Message[]>({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/chats/${chatId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    },
    enabled: !!chatId
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, contentType = 'text', mediaUrl = null }: {
      content: string;
      contentType?: 'text' | 'image';
      mediaUrl?: string | null;
    }) => {
      socket?.emit('message:new', {
        chatId,
        content,
        contentType,
        mediaUrl
      });
    }
  });

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing:start', { chatId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('typing:stop', { chatId });
    }, 1000);
  };

  useEffect(() => {
    if (!socket || !chatId) return;

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData<Message[]>(['messages', chatId], (old = []) => {
        return [...old, message];
      });
    };

    const handleMessageReaction = (data: { messageId: string; userId: string; reaction: string }) => {
      queryClient.setQueryData<Message[]>(['messages', chatId], (old = []) => {
        return old.map(message => {
          if (message.id === data.messageId) {
            return {
              ...message,
              reactions: [...message.reactions, { user_id: data.userId, reaction: data.reaction }]
            };
          }
          return message;
        });
      });
    };

    const handleTypingStart = (data: { userId: string; username: string }) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          if (!prev.some(u => u.id === data.userId)) {
            return [...prev, { id: data.userId, username: data.username }];
          }
          return prev;
        });
      }
    };

    const handleTypingStop = (data: { userId: string }) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => prev.filter(u => u.id !== data.userId));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:reaction', handleMessageReaction);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:reaction', handleMessageReaction);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, chatId, queryClient, user?.id]);

  if (!chatId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a chat to start messaging
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <ErrorMessage 
          message={(error as Error).message || 'Failed to load messages'} 
          className="text-center"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ChatHeader chatId={chatId} />
      <MessageList messages={messages} />
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500 italic">
          {typingUsers.length === 1
            ? `${typingUsers[0].username} is typing...`
            : `${typingUsers.map(u => u.username).join(', ')} are typing...`}
        </div>
      )}
      <MessageInput
        onSend={sendMessage.mutate}
        onTyping={handleTyping}
        isTyping={isTyping}
      />
    </div>
  );
};

export default ChatArea; 