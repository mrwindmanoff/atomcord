import { io } from '../server.js';
import { getUser } from '../store/users.js';

// Хранилище серверов
const servers = new Map();
let nextServerId = 1;
let nextChannelId = 1;

function createServer(name, ownerId) {
  const id = `server_${nextServerId++}`;
  const server = {
    id,
    name,
    ownerId,
    channels: [],
    members: new Set([ownerId]),
    createdAt: Date.now()
  };
  
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

function getUserServers(userId) {
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

function addUserToServer(serverId, userId) {
  const server = servers.get(serverId);
  if (server) {
    server.members.add(userId);
    return true;
  }
  return false;
}

export function handleServers(socket) {
  
  socket.on('create-server', ({ name }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      if (callback) callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    
    const server = createServer(name, user.id);
    socket.emit('server-created', {
      id: server.id,
      name: server.name,
      channels: server.channels
    });
    
    if (callback) callback({ success: true, server: { id: server.id, name: server.name } });
  });
  
  // ИСПРАВЛЕННЫЙ ОБРАБОТЧИК
  socket.on('get-servers', (callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const userServers = getUserServers(user.id);
    
    // Проверяем, является ли callback функцией
    if (callback && typeof callback === 'function') {
      callback(userServers);
    } else {
      socket.emit('servers-list', userServers);
    }
  });
  
  socket.on('join-server', ({ serverId }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    socket.join(`server:${serverId}`);
    addUserToServer(serverId, user.id);
    
    const server = servers.get(serverId);
    if (server) {
      socket.emit('server-channels', server.channels);
    }
    
    if (callback) callback({ success: true });
  });
  
  socket.on('create-channel', ({ serverId, name, type }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const server = servers.get(serverId);
    if (!server) {
      if (callback) callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    
    const newChannel = {
      id: `channel_${nextChannelId++}`,
      name: name.trim(),
      type,
      serverId
    };
    
    server.channels.push(newChannel);
    io.to(`server:${serverId}`).emit('channel-created', newChannel);
    
    if (callback) callback({ success: true, channel: newChannel });
  });
}