import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import ChatParticipantsModal from './ChatParticipantsModal';
import { LoadingSpinner } from '../common';

interface Participant {
  id: string;
  username: string;
  role: 'admin' | 'member';
}

interface Chat {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  participants: Participant[];
}

interface ChatHeaderProps {
  chatId: string;
}

interface AuthStore {
  user: { id: string } | null;
  token: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ chatId }) => {
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState<boolean>(false);
  const { user, token } = useAuthStore() as AuthStore;

  const { data: chat, isLoading } = useQuery<Chat>({
    queryKey: ['chats', chatId],
    queryFn: async () => {
      const response = await axios.get<Chat>(
        `${import.meta.env.VITE_API_URL}/api/chats/${chatId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="h-16 border-b flex items-center justify-center">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-16 border-b flex items-center justify-center text-gray-500">
        Chat not found
      </div>
    );
  }

  const getChatName = (): string => {
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find((p: Participant) => p.id !== user?.id);
      return otherParticipant?.username || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  };

  const getParticipantCount = (): string | null => {
    if (chat.type === 'direct') return null;
    return `${chat.participants.length} participants`;
  };

  return (
    <div className="h-16 border-b flex items-center justify-between px-4">
      <div>
        <h2 className="font-medium">{getChatName()}</h2>
        {getParticipantCount() && (
          <p className="text-sm text-gray-500">{getParticipantCount()}</p>
        )}
      </div>
      <button
        onClick={() => setIsParticipantsModalOpen(true)}
        className="p-2 text-gray-500 hover:text-gray-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <ChatParticipantsModal
        isOpen={isParticipantsModalOpen}
        onClose={() => setIsParticipantsModalOpen(false)}
        chatId={chatId}
        participants={chat.participants}
        chatName={chat.name}
        isGroupChat={chat.type === 'group'}
      />
    </div>
  );
};

export default ChatHeader; 