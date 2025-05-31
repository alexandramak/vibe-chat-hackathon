import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateChatModal = ({ isOpen, onClose }: CreateChatModalProps) => {
  const [chatName, setChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: createChat, isPending } = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chats/group`,
        {
          name: chatName,
          participantIds: selectedUsers.map(user => user.id)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['chats']);
      onClose();
      navigate(`/chat/${data.id}`);
    }
  });

  const { mutate: searchUsers, data: searchResults = [] } = useMutation({
    mutationFn: async (query: string) => {
      if (!query.trim()) return [];
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/users/search?query=${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    }
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchUsers(query);
    }
  };

  const handleUserSelect = (user: { id: string; username: string }) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatName.trim() && selectedUsers.length > 0) {
      createChat();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Create Group Chat
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="chatName" className="block text-sm font-medium text-gray-700">
                        Chat Name
                      </label>
                      <input
                        type="text"
                        id="chatName"
                        value={chatName}
                        onChange={(e) => setChatName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter chat name"
                      />
                    </div>

                    <div>
                      <label htmlFor="participants" className="block text-sm font-medium text-gray-700">
                        Add Participants
                      </label>
                      <input
                        type="text"
                        id="participants"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Search users..."
                      />

                      {/* Search results */}
                      {searchQuery && searchResults.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-gray-200">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleUserSelect(user)}
                              className="w-full p-2 text-left hover:bg-gray-50"
                            >
                              {user.username}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Selected users */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedUsers.map((user) => (
                          <span
                            key={user.id}
                            className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800"
                          >
                            {user.username}
                            <button
                              type="button"
                              onClick={() => handleUserRemove(user.id)}
                              className="ml-2 text-indigo-600 hover:text-indigo-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!chatName.trim() || selectedUsers.length === 0 || isPending}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Create Chat
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateChatModal; 