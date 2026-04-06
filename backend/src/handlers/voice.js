import { io } from '../server.js';
import { getUser } from '../store/users.js';

const voiceRooms = new Map();

export function handleVoice(socket) {
  
  socket.on('join-voice', ({ channelId }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      if (callback) callback({ success: false });
      return;
    }
    
    // Выход из предыдущих комнат
    for (const [chId, users] of voiceRooms) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(`voice:${chId}`).emit('user-left-voice', { 
          socketId: socket.id, 
          nickname: user.nickname 
        });
        socket.leave(`voice:${chId}`);
      }
    }
    
    if (!voiceRooms.has(channelId)) {
      voiceRooms.set(channelId, new Set());
    }
    voiceRooms.get(channelId).add(socket.id);
    socket.join(`voice:${channelId}`);
    
    socket.to(`voice:${channelId}`).emit('user-joined-voice', {
      socketId: socket.id,
      nickname: user.nickname
    });
    
    const usersInChannel = [];
    for (const uid of voiceRooms.get(channelId)) {
      const u = getUser(uid);
      if (u) usersInChannel.push({ socketId: uid, nickname: u.nickname });
    }
    socket.emit('voice-users', usersInChannel);
    
    if (callback) callback({ success: true });
  });
  
  socket.on('get-voice-users', (channelId, callback) => {
    const usersInChannel = [];
    const room = voiceRooms.get(channelId);
    if (room) {
      for (const uid of room) {
        const u = getUser(uid);
        if (u) usersInChannel.push({ socketId: uid, nickname: u.nickname });
      }
    }
    if (callback) callback(usersInChannel);
  });
  
  socket.on('leave-voice', ({ channelId }) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const room = voiceRooms.get(channelId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) voiceRooms.delete(channelId);
    }
    
    socket.to(`voice:${channelId}`).emit('user-left-voice', {
      socketId: socket.id,
      nickname: user.nickname
    });
    socket.leave(`voice:${channelId}`);
  });
  
  // Keep-alive ping/pong
  socket.on('voice-ping', ({ channelId }) => {
    socket.emit('voice-pong');
  });
  
  // WebRTC сигналинг
  socket.on('voice-offer', ({ targetId, offer }) => {
    io.to(targetId).emit('voice-offer', { fromId: socket.id, offer });
  });
  
  socket.on('voice-answer', ({ targetId, answer }) => {
    io.to(targetId).emit('voice-answer', { fromId: socket.id, answer });
  });
  
  socket.on('voice-ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('voice-ice-candidate', { fromId: socket.id, candidate });
  });
}