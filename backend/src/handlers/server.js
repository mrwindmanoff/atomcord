import { io } from '../server.js';
import { getUser } from '../store/users.js';
import { 
  createServer, 
  createChannel, 
  deleteChannel,
  getUserServers,
  getServerChannels,
  addUserToServer,
  canViewChannel
} from '../store/servers.js';

export function handleServers(socket) {
  
  // Создание сервера
  socket.on('create-server', ({ name }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    
    const server = createServer(name, user.id);
    addUserToServer(server.id, user.id);
    
    socket.emit('server-created', server);
    callback({ success: true, server });
  });
  
  // Получить все сервера пользователя
  socket.on('get-servers', (callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const servers = getUserServers(user.id);
    callback(servers);
  });
  
  // Получить каналы сервера
  socket.on('get-server-channels', ({ serverId }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const channels = getServerChannels(serverId, user.id);
    callback(channels);
  });
  
  // Создание канала в сервере
  socket.on('create-channel', ({ serverId, name, type }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const channel = createChannel(serverId, name, type, user.id);
    if (channel) {
      // Оповещаем всех в сервере
      io.to(`server:${serverId}`).emit('channel-created', channel);
      callback({ success: true, channel });
    } else {
      callback({ success: false, error: 'Не удалось создать канал' });
    }
  });
  
  // Удаление канала
  socket.on('delete-channel', ({ channelId }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const success = deleteChannel(channelId, user.id);
    if (success) {
      io.emit('channel-deleted', { channelId });
      callback({ success: true });
    } else {
      callback({ success: false, error: 'Нет прав' });
    }
  });
  
  // Присоединение к серверу
  socket.on('join-server', ({ serverId }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    socket.join(`server:${serverId}`);
    addUserToServer(serverId, user.id);
    
    callback({ success: true });
  });
}