import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.vi-stocks.com';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket | null => {
  if (!token) return null;
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 3,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
  });

  socket.on('connect_error', (err) => {
    // Tránh log lỗi liên tục nếu là lỗi xác thực (Token không hợp lệ)
    if (err.message === 'Token không hợp lệ' || err.message === 'Không có token') {
      console.warn('⚠️ Socket Auth Error:', err.message);
      // Ngắt kết nối ngay để tránh loop
      socket?.disconnect();
    } else {
      console.error('❌ Socket Error:', err.message);
    }
  });
  socket.on('disconnect', () => {
    console.log('❌ Socket ngắt kết nối');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

export default { connectSocket, disconnectSocket, getSocket };
