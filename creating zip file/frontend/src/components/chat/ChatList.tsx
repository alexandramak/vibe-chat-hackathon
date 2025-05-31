import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { LoadingSpinner, ErrorMessage } from '../common';
import CreateChatModal from './CreateChatModal';
import MessageSearch from './MessageSearch';
import UserSettings from '../settings/UserSettings';

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

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  isLoading?: boolean;
  error?: Error | null;
}

const ChatList = ({ chats, selectedChatId, onSelectChat, isLoading, error }: ChatListProps) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { user, logout } = useAuthStore();

  const getChatName = (chat: Chat) => {
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(p => p.id !== user?.id);
      return otherParticipant?.username || 'Unknown User';
    }
    return chat.name;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex items-center space-x-2">
            <Link
              to="/chat/contacts"
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Contacts"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM5 8a2 2 0 01-2-2v4a1 1 0 001 1h1a2 2 0 012-2h4a2 2 0 012 2h1a1 1 0 001-1V6a2 2 0 01-2-2H5z" />
              </svg>
            </Link>
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Search Messages"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 text-indigo-600 hover:text-indigo-900"
              title="New Chat"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Settings"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Welcome, {user?.username}!</span>
          <button
            onClick={logout}
            className="text-red-600 hover:text-red-800"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <ErrorMessage 
              message={error.message || 'Failed to load chats'} 
              className="text-center"
            />
          </div>
        ) : chats.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            No chats yet. Start a new conversation!
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full p-4 border-b hover:bg-gray-50 text-left flex items-center space-x-3 ${
                selectedChatId === chat.id ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {getChatName(chat)}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {format(new Date(chat.updated_at), 'HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {chat.type === 'group' ? `${chat.participants.length} members` : ''}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Modals */}
      <CreateChatModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <MessageSearch
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />

      <UserSettings
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default ChatList; 