import { io } from 'socket.io-client';

// ВАЖНО: на продакшене используем переменную окружения
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

console.log('🔌 Подключение к серверу:', SERVER_URL);

let socket = null;

export function initSocket(nickname, password, onSuccess, onError) {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  });
  
  const timeout = setTimeout(() => {
    console.error('❌ Таймаут подключения');
    if (onError) onError('Сервер не отвечает');
  }, 8000);
  
  socket.on('connect', () => {
    console.log('✅ Сокет подключен к серверу');
    clearTimeout(timeout);
    
    // Отправляем регистрацию/логин
    socket.emit('login', { nickname, password }, (response) => {
      console.log('📝 Ответ сервера:', response);
      
      if (response && response.success) {
        onSuccess({
          socketId: socket.id,
          nickname: response.nickname,
          token: response.token
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