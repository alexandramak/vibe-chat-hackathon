import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { LoadingSpinner, ErrorMessage } from '../common';

interface SearchMessage {
  id: string;
  content: string;
  content_type: 'text' | 'image';
  media_url: string | null;
  chat_room_id: string;
  chat_name: string | null;
  chat_type: 'direct' | 'group';
  sender: {
    id: string;
    username: string;
  };
  created_at: string;
}

interface MessageSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessageSearch: React.FC<MessageSearchProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { token } = useAuthStore();
  const navigate = useNavigate();

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading, error } = useQuery<SearchMessage[]>({
    queryKey: ['messageSearch', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/search?query=${encodeURIComponent(debouncedQuery)}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    enabled: !!debouncedQuery.trim()
  });

  const handleMessageClick = (message: SearchMessage) => {
    navigate(`/chat/${message.chat_room_id}`);
    onClose();
  };

  const getChatDisplayName = (message: SearchMessage) => {
    if (message.chat_type === 'direct') {
      return message.sender.username;
    }
    return message.chat_name || 'Group Chat';
  };

  const highlightSearchTerm = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return <mark key={index} className="bg-yellow-200">{part}</mark>;
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Search Messages</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in all messages..."
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-indigo-500"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {!debouncedQuery.trim() ? (
            <div className="text-center text-gray-500 mt-8">
              Type to search across all your messages
            </div>
          ) : isLoading ? (
            <div className="flex justify-center mt-8">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <div className="mt-8">
              <ErrorMessage
                message={(error as Error).message || 'Failed to search messages'}
                className="text-center"
              />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No messages found for "{debouncedQuery}"
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((message) => (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-indigo-600">
                        {getChatDisplayName(message)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-500">
                        {message.sender.username}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(message.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900">
                    {message.content_type === 'text' ? (
                      <div className="line-clamp-2">
                        {highlightSearchTerm(message.content, debouncedQuery)}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-500">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        <span>Image</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center">
          <p className="text-xs text-gray-500">
            Click on a message to go to that chat
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageSearch; 