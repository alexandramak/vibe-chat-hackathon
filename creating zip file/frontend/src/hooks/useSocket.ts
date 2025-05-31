import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(`${import.meta.env.VITE_API_URL}`, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('error', (error: Error) => {
      console.error('Socket error:', error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  return { socket, isConnected };
}; 