import { io } from 'socket.io-client';

// ПРАВИЛЬНЫЙ URL для продакшена (твой бекенд на Render)
// НЕ ИСПОЛЬЗУЙ localhost или относительные пути!
const SERVER_URL = 'https://atomcord-backend.onrender.com';

console.log('🔌 Фронтенд пытается подключиться к:', SERVER_URL);

let socket = null;

export function initSocket(nickname, password, onSuccess, onError) {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'], // Пробуем оба способа
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 15000,
    withCredentials: false,
    path: '/socket.io/' // Явно указываем путь
  });

  const timeoutId = setTimeout(() => {
    console.error('❌ Таймаут подключения к бекенду');
    onError?.('Сервер не отвечает. Проверь интернет.');
  }, 10000);

  socket.on('connect', () => {
    console.log('✅ Соединение с бекендом установлено! ID сокета:', socket.id);
    clearTimeout(timeoutId);
    
    // Отправляем регистрацию
    socket.emit('register', { nickname, password }, (response) => {
      console.log('📝 Ответ от сервера при регистрации:', response);
      if (response?.success) {
        onSuccess({
          socketId: socket.id,
          nickname: response.nickname,
          token: response.token
        });
      } else {
        onError?.(response?.error || 'Ошибка авторизации на сервере');
      }
    });
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Ошибка соединения WebSocket:', error.message);
    clearTimeout(timeoutId);
    onError?.(`Не могу подключиться к серверу: ${error.message}`);
  });

  return socket;
}

export function getSocket() {
  if (!socket) throw new Error('Сокет не инициализирован');
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}