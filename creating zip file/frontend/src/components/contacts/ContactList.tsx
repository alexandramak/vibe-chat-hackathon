import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner, ErrorMessage } from '../common';

interface Contact {
  id: string;
  username: string;
  status: 'pending' | 'accepted' | 'blocked';
  connected_at: string;
}

// UUID validation function
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const ContactList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading: isContactsLoading, error: contactsError } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/users/contacts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Raw contacts response:', response.data);
      
      // Validate each contact has a proper UUID
      const validatedContacts = response.data.filter((contact: Contact) => {
        console.log('Contact ID validation:', contact.id, 'Valid:', isValidUUID(contact.id));
        if (!isValidUUID(contact.id)) {
          console.error('Invalid contact ID found:', contact.id, contact);
          return false;
        }
        return true;
      });
      
      return validatedContacts;
    }
  });

  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery<{ id: string; username: string }[]>({
    queryKey: ['userSearch', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/users/search?query=${searchQuery}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Validate search results have proper UUIDs
      const validatedResults = response.data.filter((user: { id: string; username: string }) => {
        console.log('Search result ID validation:', user.id, 'Valid:', isValidUUID(user.id));
        return isValidUUID(user.id);
      });
      
      return validatedResults;
    },
    enabled: !!searchQuery.trim()
  });

  const addContact = useMutation({
    mutationFn: async (userId: string) => {
      console.log('Adding contact with ID:', userId, 'Valid UUID:', isValidUUID(userId));
      if (!isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/contacts/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
    },
    onError: (error) => {
      console.error('Error adding contact:', error);
    }
  });

  const acceptContact = useMutation({
    mutationFn: async (userId: string) => {
      console.log('Accepting contact with ID:', userId, 'Valid UUID:', isValidUUID(userId));
      if (!isValidUUID(userId)) {
        throw new Error('Invalid contact ID format');
      }
      
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/contacts/${userId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
    },
    onError: (error) => {
      console.error('Error accepting contact:', error);
    }
  });

  const removeContact = useMutation({
    mutationFn: async (userId: string) => {
      console.log('Removing contact with ID:', userId, 'Valid UUID:', isValidUUID(userId));
      if (!isValidUUID(userId)) {
        throw new Error('Invalid contact ID format');
      }
      
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/users/contacts/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
    },
    onError: (error) => {
      console.error('Error removing contact:', error);
    }
  });

  const startChat = async (userId: string) => {
    try {
      console.log('Starting chat with user ID:', userId, 'Valid UUID:', isValidUUID(userId));
      if (!isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chats/direct/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/chat/${response.data.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">Contacts</h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full p-2 border rounded-lg"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          // Search results
          <div className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Search Results</h3>
            {isSearchLoading ? (
              <LoadingSpinner size="md" className="mt-4" />
            ) : searchResults.length === 0 ? (
              <p className="text-gray-500 text-center mt-4">No users found</p>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg shadow"
                >
                  <span>{user.username}</span>
                  <button
                    onClick={() => addContact.mutate(user.id)}
                    disabled={addContact.isPending}
                    className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {addContact.isPending ? 'Adding...' : 'Add Contact'}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : isContactsLoading ? (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : contactsError ? (
          <div className="h-full flex items-center justify-center">
            <ErrorMessage 
              message={(contactsError as Error).message || 'Failed to load contacts'} 
              className="text-center"
            />
          </div>
        ) : (
          // Contact list
          <div className="p-4 space-y-4">
            {/* Pending requests */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Pending Requests</h3>
              {contacts
                .filter((contact) => contact.status === 'pending')
                .map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg shadow"
                  >
                    <span>{contact.username}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => acceptContact.mutate(contact.id)}
                        disabled={acceptContact.isPending}
                        className="px-3 py-1 text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        {acceptContact.isPending ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => removeContact.mutate(contact.id)}
                        disabled={removeContact.isPending}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {removeContact.isPending ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Accepted contacts */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Contacts</h3>
              {contacts
                .filter((contact) => contact.status === 'accepted')
                .map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg shadow"
                  >
                    <span>{contact.username}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startChat(contact.id)}
                        className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Message
                      </button>
                      <button
                        onClick={() => removeContact.mutate(contact.id)}
                        disabled={removeContact.isPending}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {removeContact.isPending ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {contacts.length === 0 && (
              <p className="text-gray-500 text-center mt-8">
                No contacts yet. Search for users to add them as contacts.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactList; 