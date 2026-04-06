import { io } from '../server.js';
import { registerUser, loginUser, addUser, getAllUsers, getUser, removeUser } from '../store/users.js';

export function handleConnection(socket) {
  
  // Регистрация с паролем
  socket.on('register', ({ nickname, password }, callback) => {
    console.log(`📝 Регистрация: ${nickname}`);
    const result = registerUser(nickname, password);
    
    if (result.success) {
      const user = addUser(socket.id, nickname, result.user.id);
      
      io.emit('users-list', getAllUsers());
      socket.broadcast.emit('user-joined', { nickname });
      
      callback({ 
        success: true, 
        nickname, 
        userId: result.user.id
      });
    } else {
      callback({ success: false, error: result.error });
    }
  });
  
  // Вход с паролем
  socket.on('login', ({ nickname, password }, callback) => {
    console.log(`🔐 Вход: ${nickname}`);
    const result = loginUser(nickname, password);
    
    if (result.success) {
      const user = addUser(socket.id, nickname, result.user.id);
      
      callback({ 
        success: true, 
        nickname, 
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
    const user = getUser(socket.id);
    if (user) {
      removeUser(socket.id);
      io.emit('users-list', getAllUsers());
      io.emit('user-left', { nickname: user.nickname });
      console.log(`👋 Пользователь вышел: ${user.nickname}`);
    }
  });
}