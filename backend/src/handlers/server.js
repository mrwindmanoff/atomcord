import { io } from '../server.js';
import { getUser } from '../store/users.js';

// Хранилище серверов (в памяти)
const servers = new Map(); // serverId -> { id, name, ownerId, channels, members }
let nextServerId = 1;
let nextChannelId = 1;

// Создание сервера
export function createServer(name, ownerId) {
  const id = `server_${nextServerId++}`;
  const server = {
    id,
    name,
    ownerId,
    channels: [],
    members: new Set([ownerId]),
    createdAt: Date.now()
  };
  
  // Создаём стандартные каналы
  server.channels.push({
    id: `channel_${nextChannelId++}`,
    name: 'Общий',
    type: 'text',
    serverId: id
  });
  server.channels.push({
    id: `channel_${nextChannelId++}`,
    name: 'Голосовой штаб',
    type: 'voice',
    serverId: id
  });
  
  servers.set(id, server);
  return server;
}

// Получить все сервера пользователя
export function getUserServers(userId) {
  const userServers = [];
  for (const server of servers.values()) {
    if (server.members.has(userId)) {
      userServers.push({
        id: server.id,
        name: server.name,
        channels: server.channels
      });
    }
  }
  return userServers;
}

// Добавить пользователя в сервер
export function addUserToServer(serverId, userId) {
  const server = servers.get(serverId);
  if (server) {
    server.members.add(userId);
  }
}

export function handleServers(socket) {
  
  // Создание сервера
  socket.on('create-server', ({ name }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    
    const server = createServer(name, user.id);
    socket.emit('server-created', {
      id: server.id,
      name: server.name,
      channels: server.channels
    });
    
    callback({ success: true, server: { id: server.id, name: server.name } });
  });
  
  // Получить все сервера пользователя
  socket.on('get-servers', (callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const userServers = getUserServers(user.id);
    callback(userServers);
  });
  
  // Присоединение к серверу
  socket.on('join-server', ({ serverId }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    socket.join(`server:${serverId}`);
    addUserToServer(serverId, user.id);
    
    // Отправляем каналы сервера
    const server = servers.get(serverId);
    if (server) {
      socket.emit('server-channels', server.channels);
    }
    
    callback({ success: true });
  });
  
  // Создание канала в сервере
  socket.on('create-channel', ({ serverId, name, type }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const server = servers.get(serverId);
    if (!server) {
      callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    
    const newChannel = {
      id: `channel_${nextChannelId++}`,
      name: name.trim(),
      type,
      serverId
    };
    
    server.channels.push(newChannel);
    
    // Оповещаем всех в сервере
    io.to(`server:${serverId}`).emit('channel-created', newChannel);
    
    callback({ success: true, channel: newChannel });
  });
}