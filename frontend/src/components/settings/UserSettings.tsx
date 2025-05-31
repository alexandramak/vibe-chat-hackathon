import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { LoadingSpinner } from '../common';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { user, token, logout } = useAuthStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const changePassword = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/change-password`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      addNotification({
        message: 'Password changed successfully',
        type: 'success',
        autoHideDuration: 3000
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      addNotification({
        message: error.response?.data?.message || 'Failed to change password',
        type: 'error',
        autoHideDuration: 3000
      });
    }
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/users/account`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      addNotification({
        message: 'Account deleted successfully',
        type: 'success',
        autoHideDuration: 3000
      });
      logout();
    },
    onError: (error: any) => {
      addNotification({
        message: error.response?.data?.message || 'Failed to delete account',
        type: 'error',
        autoHideDuration: 3000
      });
    }
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addNotification({
        message: 'Passwords do not match',
        type: 'error',
        autoHideDuration: 3000
      });
      return;
    }
    if (newPassword.length < 6) {
      addNotification({
        message: 'Password must be at least 6 characters',
        type: 'error',
        autoHideDuration: 3000
      });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      deleteAccount.mutate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Information */}
          <div>
            <h3 className="text-md font-medium mb-4">Account Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <div className="mt-1 p-2 bg-gray-50 border rounded text-sm text-gray-600">
                  {user?.username}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <div className="mt-1 p-2 bg-gray-50 border rounded text-sm text-gray-600 font-mono">
                  {user?.id}
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div>
            <h3 className="text-md font-medium mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changePassword.isPending ? <LoadingSpinner size="sm" /> : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-md font-medium mb-4 text-red-600">Danger Zone</h3>
            <div className="border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Delete Account</h4>
              <p className="text-sm text-red-600 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending}
                className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {deleteAccount.isPending ? <LoadingSpinner size="sm" /> : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSettings; 