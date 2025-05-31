import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { LoadingSpinner } from '../common';

interface Participant {
  id: string;
  username: string;
  role: 'admin' | 'member';
}

interface ChatParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  participants: Participant[];
  chatName: string | null;
  isGroupChat: boolean;
}

interface AuthStore {
  user: { id: string } | null;
  token: string;
}

interface NotificationStore {
  addNotification: (notification: { message: string; type: string; autoHideDuration?: number }) => void;
}

const ChatParticipantsModal: React.FC<ChatParticipantsModalProps> = ({
  isOpen,
  onClose,
  chatId,
  participants,
  chatName,
  isGroupChat
}) => {
  const [newParticipantUsername, setNewParticipantUsername] = useState('');
  const [newChatName, setNewChatName] = useState(chatName || '');
  const { user, token } = useAuthStore() as AuthStore;
  const addNotification = useNotificationStore((state: NotificationStore) => state.addNotification);
  const queryClient = useQueryClient();

  const isAdmin = participants.some(p => p.id === user?.id && p.role === 'admin');

  const addParticipant = useMutation({
    mutationFn: async (username: string) => {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chats/${chatId}/participants`,
        { username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', chatId] });
      addNotification({
        message: 'Participant added successfully',
        type: 'success',
        autoHideDuration: 3000
      });
      setNewParticipantUsername('');
    },
    onError: (error: any) => {
      addNotification({
        message: error.response?.data?.message || 'Failed to add participant',
        type: 'error',
        autoHideDuration: 3000
      });
    }
  });

  const removeParticipant = useMutation({
    mutationFn: async (participantId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/chats/${chatId}/participants/${participantId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', chatId] });
      addNotification({
        message: 'Participant removed successfully',
        type: 'success',
        autoHideDuration: 3000
      });
    },
    onError: (error: any) => {
      addNotification({
        message: error.response?.data?.message || 'Failed to remove participant',
        type: 'error',
        autoHideDuration: 3000
      });
    }
  });

  const updateChatName = useMutation({
    mutationFn: async (name: string) => {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/chats/${chatId}`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', chatId] });
      addNotification({
        message: 'Chat name updated successfully',
        type: 'success',
        autoHideDuration: 3000
      });
    },
    onError: (error: any) => {
      addNotification({
        message: error.response?.data?.message || 'Failed to update chat name',
        type: 'error',
        autoHideDuration: 3000
      });
    }
  });

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newParticipantUsername.trim()) {
      addParticipant.mutate(newParticipantUsername.trim());
    }
  };

  const handleUpdateChatName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChatName.trim() && newChatName !== chatName) {
      updateChatName.mutate(newChatName.trim());
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
            Chat Participants
          </Dialog.Title>

          {isGroupChat && isAdmin && (
            <form onSubmit={handleUpdateChatName} className="mt-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="Chat name"
                  className="flex-1 p-2 border rounded"
                />
                <button
                  type="submit"
                  disabled={!newChatName.trim() || newChatName === chatName}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </form>
          )}

          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">Participants</h3>
            <div className="mt-2 space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <span className="font-medium">{participant.username}</span>
                    {participant.role === 'admin' && (
                      <span className="ml-2 text-xs text-indigo-600">Admin</span>
                    )}
                  </div>
                  {isAdmin && participant.id !== user?.id && (
                    <button
                      onClick={() => removeParticipant.mutate(participant.id)}
                      disabled={removeParticipant.isPending}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isGroupChat && isAdmin && (
            <form onSubmit={handleAddParticipant} className="mt-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newParticipantUsername}
                  onChange={(e) => setNewParticipantUsername(e.target.value)}
                  placeholder="Username"
                  className="flex-1 p-2 border rounded"
                />
                <button
                  type="submit"
                  disabled={!newParticipantUsername.trim() || addParticipant.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-50"
                >
                  {addParticipant.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ChatParticipantsModal; 