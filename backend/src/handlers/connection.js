import { io } from '../server.js';
import { registerUser, loginUser, addUser, getAllUsers, getUser, removeUser, getUserById } from '../store/users.js';

export function handleConnection(socket) {
  
  // Регистрация с паролем
  socket.on('register', ({ nickname, password }, callback) => {
    console.log(`📝 Регистрация: ${nickname}`);
    const result = registerUser(nickname, password);
    
    if (result.success) {
      const user = addUser(socket.id, nickname, result.user.id);
      
      // Добавляем пользователя в его персональную комнату для ЛС
      socket.join(`user_${result.user.id}`);
      
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
      
      // Добавляем пользователя в его персональную комнату для ЛС
      socket.join(`user_${result.user.id}`);
      
      // Отправляем список всех пользователей для глобального поиска
      socket.emit('all-users', getAllUsers());
      
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
  
  // Получить всех пользователей для глобального поиска
  socket.on('get-all-users', (callback) => {
    const allUsers = getAllUsers();
    if (callback && typeof callback === 'function') {
      callback(allUsers);
    } else {
      socket.emit('all-users', allUsers);
    }
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