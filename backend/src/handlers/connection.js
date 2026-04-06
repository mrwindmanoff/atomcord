import { io } from '../server.js';
import { registerUser, loginUser, getUser, getAllUsers, removeUser } from '../store/users.js';

export function handleConnection(socket) {
  
  // Регистрация
  socket.on('register', ({ nickname, password }, callback) => {
    console.log(`📝 Регистрация: ${nickname}`);
    const result = registerUser(nickname, password);
    
    if (result.success) {
      socket.userId = result.user.id;
      socket.nickname = nickname;
      
      // Отправляем список всем
      io.emit('users-list', getAllUsers());
      socket.broadcast.emit('user-joined', { nickname });
      
      callback({ 
        success: true, 
        nickname, 
        token: result.user.token,
        userId: result.user.id
      });
    } else {
      callback({ success: false, error: result.error });
    }
  });
  
  // Вход
  socket.on('login', ({ nickname, password }, callback) => {
    console.log(`🔐 Вход: ${nickname}`);
    const result = loginUser(nickname, password);
    
    if (result.success) {
      socket.userId = result.user.id;
      socket.nickname = nickname;
      
      callback({ 
        success: true, 
        nickname, 
        token: result.user.token,
        userId: result.user.id
      });
    } else {
      callback({ success: false, error: result.error });
    }
  });
  
  // Получить всех пользователей
  socket.on('get-users', (callback) => {
    if (callback) callback(getAllUsers());
    else socket.emit('users-list', getAllUsers());
  });
  
  // Отключение
  socket.on('disconnect', () => {
    if (socket.nickname) {
      removeUser(socket.userId);
      io.emit('users-list', getAllUsers());
      io.emit('user-left', { nickname: socket.nickname });
      console.log(`👋 Пользователь вышел: ${socket.nickname}`);
    }
  });
}