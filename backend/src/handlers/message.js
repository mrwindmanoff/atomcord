import { io } from '../server.js';
import { getUser } from '../store/users.js';

// Хранилище сообщений
const messages = [];

export function handleMessages(socket) {
  
  socket.on('join-text-channel', (channelId, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      if (callback) callback({ success: false });
      return;
    }
    
    // Выходим из старого канала
    if (socket.currentTextChannel) {
      socket.leave(socket.currentTextChannel);
    }
    
    // Заходим в новый
    socket.join(channelId);
    socket.currentTextChannel = channelId;
    
    // Отправляем историю
    const channelMessages = messages.filter(m => m.channelId === channelId).slice(-50);
    socket.emit('channel-history', { channelId, messages: channelMessages });
    
    if (callback) callback({ success: true });
  });
  
  socket.on('send-message', ({ channelId, text }, callback) => {
    const user = getUser(socket.id);
    
    if (!user || !text?.trim()) {
      if (callback) callback({ success: false });
      return;
    }
    
    const message = {
      id: Date.now().toString(),
      channelId,
      text: text.trim(),
      nickname: user.nickname,
      timestamp: Date.now()
    };
    
    messages.push(message);
    
    // Отправляем ВСЕМ в канале (включая отправителя)
    io.to(channelId).emit('new-message', message);
    
    if (callback) callback({ success: true, message });
  });
}