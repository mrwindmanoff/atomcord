import { io } from '../server.js';
import { getUser, getUserById, getAllUsers } from '../store/users.js';

const messages = [];
const dms = [];

export function handleMessages(socket) {
  
  socket.on('join-text-channel', (channelId, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    socket.join(channelId);
    const channelMessages = messages.filter(m => m.channelId === channelId).slice(-50);
    socket.emit('channel-history', { channelId, messages: channelMessages });
    if (callback) callback({ success: true });
  });
  
  socket.on('send-message', ({ channelId, text }, callback) => {
    const user = getUser(socket.id);
    if (!user || !text?.trim()) return;
    const message = {
      id: Date.now().toString(),
      channelId,
      text: text.trim(),
      nickname: user.nickname,
      userId: user.id,
      timestamp: Date.now()
    };
    messages.push(message);
    io.to(channelId).emit('new-message', message);
    if (callback) callback({ success: true, message });
  });
  
  socket.on('send-dm', ({ targetUserId, text }, callback) => {
    const user = getUser(socket.id);
    if (!user || !text?.trim()) return;
    const dm = {
      id: Date.now().toString(),
      fromUserId: user.id,
      toUserId: targetUserId,
      text: text.trim(),
      fromNickname: user.nickname,
      timestamp: Date.now()
    };
    dms.push(dm);
    io.to(`user_${targetUserId}`).emit('new-dm', dm);
    socket.emit('new-dm', dm);
    if (callback) callback({ success: true });
  });
  
  socket.on('join-dm', ({ targetUserId }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    socket.join(`user_${user.id}`);
    const userDMs = dms.filter(d => 
      (d.fromUserId === user.id && d.toUserId === targetUserId) ||
      (d.fromUserId === targetUserId && d.toUserId === user.id)
    ).slice(-50);
    socket.emit('dm-history', { withUserId: targetUserId, messages: userDMs });
    if (callback) callback({ success: true });
  });
  
  socket.on('get-all-users', (callback) => {
    const allUsers = getAllUsers();
    if (callback && typeof callback === 'function') {
      callback(allUsers);
    } else {
      socket.emit('all-users', allUsers);
    }
  });
}