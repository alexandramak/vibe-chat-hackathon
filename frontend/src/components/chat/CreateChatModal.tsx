import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// UUID validation function
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const CreateChatModal = ({ isOpen, onClose }: CreateChatModalProps) => {
  const [chatName, setChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { token } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: createChat, isPending } = useMutation({
    mutationFn: async () => {
      console.log('🚀 Starting group chat creation...');
      
      // Validate all participant UUIDs before sending
      const invalidUUIDs = selectedUsers.filter(user => !isValidUUID(user.id));
      if (invalidUUIDs.length > 0) {
        console.error('❌ Invalid UUIDs found:', invalidUUIDs);
        throw new Error(`Invalid user IDs found: ${invalidUUIDs.map(u => u.username).join(', ')}`);
      }

      const payload = {
        name: chatName.trim(),
        participants: selectedUsers.map(user => user.id) // Changed from participantIds to participants
      };
      
      console.log('📤 Sending payload to backend:', JSON.stringify(payload, null, 2));
      console.log('🔑 Authorization token present:', !!token);
      console.log('🌐 API URL:', `${import.meta.env.VITE_API_URL}/api/chats/group`);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chats/group`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Backend response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('🎉 Group chat created successfully:', data);
      addNotification({
        message: `Group chat "${chatName}" created successfully!`,
        type: 'success',
        autoHideDuration: 3000
      });
      queryClient.invalidateQueries(['chats']);
      resetForm();
      onClose();
      navigate(`/chat/${data.id}`);
    },
    onError: (error: any) => {
      console.error('❌ Group chat creation failed:', error);
      
      let errorMessage = 'Failed to create group chat';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('invalid input syntax for type uuid')) {
        errorMessage = 'Invalid user ID format detected. Please try refreshing and selecting users again.';
      } else if (errorMessage.includes('participants array are required')) {
        errorMessage = 'Please select at least one participant for the group chat.';
      } else if (errorMessage.includes('Name must be between')) {
        errorMessage = 'Chat name must be between 1 and 100 characters.';
      }
      
      addNotification({
        message: errorMessage,
        type: 'error',
        autoHideDuration: 5000
      });
      
      console.error('💥 Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
  });

  const { mutate: searchUsers, data: searchResults = [], isPending: isSearching } = useMutation({
    mutationFn: async (query: string) => {
      console.log('🔍 Searching users with query:', query);
      if (!query.trim()) return [];
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/users/search?query=${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('👥 Search results:', response.data);
      
      // Validate search results have proper UUIDs
      const validatedResults = response.data.filter((user: { id: string; username: string }) => {
        const isValid = isValidUUID(user.id);
        if (!isValid) {
          console.warn('⚠️ Invalid UUID in search results:', user);
        }
        return isValid;
      });
      
      return validatedResults;
    },
    onError: (error: any) => {
      console.error('❌ User search failed:', error);
      addNotification({
        message: 'Failed to search users. Please try again.',
        type: 'error',
        autoHideDuration: 4000
      });
    }
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchUsers(query);
    }
  };

  const handleUserSelect = (user: { id: string; username: string }) => {
    console.log('➕ Selecting user:', user);
    
    if (!isValidUUID(user.id)) {
      console.error('❌ Attempted to select user with invalid UUID:', user);
      addNotification({
        message: 'Invalid user ID. Please try searching again.',
        type: 'error',
        autoHideDuration: 4000
      });
      return;
    }
    
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
      console.log('✅ User added to selection:', user.username);
    }
    setSearchQuery('');
  };

  const handleUserRemove = (userId: string) => {
    console.log('➖ Removing user:', userId);
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submitted with:', {
      chatName: chatName.trim(),
      selectedUsersCount: selectedUsers.length,
      selectedUsers: selectedUsers.map(u => ({ id: u.id, username: u.username }))
    });
    
    // Client-side validation with toast notifications
    if (!chatName.trim()) {
      addNotification({
        message: 'Please enter a chat name.',
        type: 'error',
        autoHideDuration: 3000
      });
      return;
    }
    
    if (chatName.trim().length > 100) {
      addNotification({
        message: 'Chat name must be 100 characters or less.',
        type: 'error',
        autoHideDuration: 3000
      });
      return;
    }
    
    if (selectedUsers.length === 0) {
      addNotification({
        message: 'Please select at least one participant.',
        type: 'error',
        autoHideDuration: 3000
      });
      return;
    }
    
    if (selectedUsers.length > 299) {
      addNotification({
        message: 'Maximum 299 participants allowed (300 including you).',
        type: 'error',
        autoHideDuration: 4000
      });
      return;
    }
    
    console.log('✅ Validation passed, creating chat...');
    createChat();
  };

  const resetForm = () => {
    setChatName('');
    setSelectedUsers([]);
    setSearchQuery('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Check if form is valid
  const isFormValid = chatName.trim().length > 0 && 
                     chatName.trim().length <= 100 && 
                     selectedUsers.length > 0 && 
                     selectedUsers.length <= 299;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
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
                        Chat Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="chatName"
                        value={chatName}
                        onChange={(e) => setChatName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter chat name (max 100 characters)"
                        maxLength={100}
                        disabled={isPending}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {chatName.length}/100 characters
                      </p>
                    </div>

                    <div>
                      <label htmlFor="participants" className="block text-sm font-medium text-gray-700">
                        Add Participants <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="participants"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Search users..."
                        disabled={isPending}
                      />

                      {/* Search loading indicator */}
                      {isSearching && (
                        <div className="mt-2 text-sm text-gray-500">Searching...</div>
                      )}

                      {/* Search results */}
                      {searchQuery && searchResults.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-gray-200">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleUserSelect(user)}
                              className="w-full p-2 text-left hover:bg-gray-50 disabled:opacity-50"
                              disabled={isPending || selectedUsers.some(u => u.id === user.id)}
                            >
                              {user.username}
                              {selectedUsers.some(u => u.id === user.id) && (
                                <span className="ml-2 text-xs text-green-600">(Already selected)</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* No search results */}
                      {searchQuery && !isSearching && searchResults.length === 0 && (
                        <div className="mt-2 text-sm text-gray-500">No users found</div>
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
                              className="ml-2 text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                              disabled={isPending}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      
                      {selectedUsers.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          {selectedUsers.length} participant{selectedUsers.length !== 1 ? 's' : ''} selected (max 299)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      disabled={isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!isFormValid || isPending}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? 'Creating...' : 'Create Chat'}
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