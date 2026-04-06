import { io } from '../server.js';
import { addUser, getAllUsers, getUser, removeUser } from '../store/users.js';

export function handleConnection(socket) {
  
  socket.on('register', (nickname, callback) => {
    const cleanNick = nickname?.trim() || `User${Math.floor(Math.random() * 1000)}`;
    addUser(socket.id, cleanNick);
    
    // Отправляем список всем
    io.emit('users-list', getAllUsers());
    
    // Сообщаем о новом пользователе
    socket.broadcast.emit('user-joined', { nickname: cleanNick });
    
    if (callback) callback({ success: true, nickname: cleanNick });
  });
  
  socket.on('get-users', (callback) => {
    if (callback) callback(getAllUsers());
    else socket.emit('users-list', getAllUsers());
  });
  
  socket.on('disconnect', () => {
    const user = getUser(socket.id);
    if (user) {
      removeUser(socket.id);
      io.emit('users-list', getAllUsers());
      io.emit('user-left', { nickname: user.nickname });
    }
  });
}