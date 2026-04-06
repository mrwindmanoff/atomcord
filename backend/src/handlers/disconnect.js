import { io } from '../server.js';
import { removeUser, getUser } from '../store/users.js';

export function handleDisconnect(socket) {
  
  socket.on('disconnect', () => {
    const user = getUser(socket.id);
    if (user) {
      io.emit('user-left', { nickname: user.nickname });
      removeUser(socket.id);
    }
  });
}