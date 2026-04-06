import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:4000';

let socket = null;

export function initSocket(nickname, onSuccess, onError) {
  if (socket && socket.connected) {
    // Если уже подключены, просто регистрируемся
    socket.emit('register', nickname, (response) => {
      if (response?.success) {
        onSuccess({ socketId: socket.id, nickname: response.nickname });
      } else {
        onError('Ошибка регистрации');
      }
    });
    return socket;
  }
  
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  
  const timeout = setTimeout(() => {
    if (onError) onError('Сервер не отвечает');
  }, 5000);
  
  socket.on('connect', () => {
    console.log('✅ Подключен к серверу');
    clearTimeout(timeout);
    
    socket.emit('register', nickname, (response) => {
      console.log('Регистрация:', response);
      if (response?.success) {
        onSuccess({
          socketId: socket.id,
          nickname: response.nickname
        });
      } else {
        onError(response?.error || 'Ошибка регистрации');
      }
    });
  });
  
  socket.on('connect_error', (error) => {
    console.error('Ошибка:', error.message);
    clearTimeout(timeout);
    onError('Не удалось подключиться к серверу');
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Отключен от сервера');
  });
  
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}