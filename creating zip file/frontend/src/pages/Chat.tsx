import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import ChatList from '../components/chat/ChatList';
import ChatArea from '../components/chat/ChatArea';
import ContactList from '../components/contacts/ContactList';
import { useSocket } from '../hooks/useSocket';

interface Chat {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  participants: Array<{
    id: string;
    username: string;
    role: string;
  }>;
  updated_at: string;
}

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
  };
  chat_id: string;
}

interface NotificationState {
  addNotification: (notification: { message: string; type: string; autoHideDuration?: number }) => void;
}

const Chat: React.FC = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { socket } = useSocket();
  const addNotification = useNotificationStore((state: NotificationState) => state.addNotification);

  const { data: chats = [], isLoading, error } = useQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (message: Message) => {
      // Only show notification if the message is from another chat
      if (message.chat_id !== selectedChatId && message.sender.id !== user.id) {
        const chat = chats.find((c: Chat) => c.id === message.chat_id);
        const chatName = chat?.name || message.sender.username;
        
        addNotification({
          message: `New message from ${chatName}: ${message.content}`,
          type: 'info',
          autoHideDuration: 5000
        });
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, selectedChatId, user, chats, addNotification]);

  useEffect(() => {
    if (selectedChatId) {
      socket?.emit('chat:join', selectedChatId);
      return () => {
        socket?.emit('chat:leave', selectedChatId);
      };
    }
  }, [selectedChatId, socket]);

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-white">
        <Routes>
          <Route path="contacts" element={<ContactList />} />
          <Route path="*" element={
            <ChatList
              chats={chats}
              selectedChatId={selectedChatId}
              onSelectChat={(chatId: string) => {
                setSelectedChatId(chatId);
                navigate(`/chat/${chatId}`);
              }}
              isLoading={isLoading}
              error={error as Error}
            />
          } />
        </Routes>
      </div>

      {/* Main chat area */}
      <div className="flex-1">
        <Routes>
          <Route path=":chatId" element={<ChatArea />} />
          <Route path="*" element={
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a chat to start messaging
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
};

export default Chat; 