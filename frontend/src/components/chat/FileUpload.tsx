import React, { useRef, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { LoadingSpinner } from '../common';

interface FileUploadProps {
  onUploadComplete: (mediaUrl: string) => void;
  onError: (error: string) => void;
}

interface AuthStore {
  token: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuthStore() as AuthStore;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Only allow images for now
    if (!file.type.startsWith('image/')) {
      onError('Only image files are allowed');
      return;
    }

    // Max file size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      onError('File size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/uploads`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      onUploadComplete(response.data.url);
    } catch (error) {
      onError('Failed to upload file');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <button
        onClick={handleButtonClick}
        disabled={isUploading}
        className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        {isUploading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

export default FileUpload; 