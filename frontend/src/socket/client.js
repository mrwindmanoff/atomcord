import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://atomcord-backend.onrender.com';

console.log('🔌 Подключение к серверу:', SERVER_URL);

let socket = null;

export function initSocket(nickname, password, onSuccess, onError, mode = 'login') {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 15000,
    withCredentials: false
  });
  
  const timeout = setTimeout(() => {
    console.error('❌ Таймаут подключения');
    if (onError) onError('Сервер не отвечает');
  }, 10000);
  
  socket.on('connect', () => {
    console.log('✅ Сокет подключен к серверу, ID:', socket.id);
    clearTimeout(timeout);
    
    // Отправляем событие в зависимости от режима
    const eventData = mode === 'login' 
      ? { nickname, password }
      : { nickname, password };
    
    socket.emit(mode, eventData, (response) => {
      console.log(`📝 Ответ сервера (${mode}):`, response);
      
      if (response && response.success) {
        onSuccess({
          socketId: socket.id,
          nickname: response.nickname,
          token: response.token,
          userId: response.userId
        });
      } else {
        onError(response?.error || 'Ошибка авторизации');
      }
    });
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Ошибка подключения:', error.message);
    clearTimeout(timeout);
    onError('Не удалось подключиться к серверу');
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