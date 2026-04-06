import { io } from '../server.js';
import { getUser } from '../store/users.js';
import { createInvite, getInvite, useInvite, getUserInvites, deleteInvite } from '../store/invites.js';

// Хранилище серверов (в памяти)
const servers = new Map();
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

// Получить сервер по ID
export function getServer(serverId) {
  return servers.get(serverId);
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
    return true;
  }
  return false;
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
  
  // Присоединение к серверу по ID (обычное)
  socket.on('join-server', ({ serverId }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    socket.join(`server:${serverId}`);
    addUserToServer(serverId, user.id);
    
    const server = servers.get(serverId);
    if (server) {
      socket.emit('server-channels', server.channels);
    }
    
    callback({ success: true });
  });
  
  // === НОВОЕ: ПРИСОЕДИНЕНИЕ ПО ИНВАЙТУ ===
  socket.on('join-server-by-invite', ({ code }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    
    const invite = getInvite(code);
    if (!invite) {
      callback({ success: false, error: 'Приглашение недействительно или истекло' });
      return;
    }
    
    const serverId = invite.serverId;
    const server = servers.get(serverId);
    
    if (!server) {
      callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    
    // Если уже в сервере
    if (server.members.has(user.id)) {
      callback({ success: true, serverId, alreadyMember: true });
      return;
    }
    
    // Используем инвайт
    useInvite(code);
    
    // Добавляем пользователя
    server.members.add(user.id);
    socket.join(`server:${serverId}`);
    
    // Оповещаем всех в сервере о новом участнике
    io.to(`server:${serverId}`).emit('user-joined-server', {
      userId: user.id,
      nickname: user.nickname
    });
    
    callback({ 
      success: true, 
      serverId, 
      serverName: server.name,
      channels: server.channels 
    });
  });
  
  // Создание инвайта
  socket.on('create-invite', ({ serverId, maxUses, expiresInHours }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    
    const server = servers.get(serverId);
    if (!server || server.ownerId !== user.id) {
      callback({ success: false, error: 'Только владелец сервера может создавать приглашения' });
      return;
    }
    
    const invite = createInvite(serverId, user.id, maxUses, expiresInHours);
    callback({ success: true, inviteUrl: invite.inviteUrl, code: invite.code });
  });
  
  // Получить все инвайты пользователя
  socket.on('get-user-invites', (callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const invites = getUserInvites(user.id);
    callback(invites);
  });
  
  // Удалить инвайт
  socket.on('delete-invite', ({ code }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const success = deleteInvite(code, user.id);
    callback({ success });
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
    io.to(`server:${serverId}`).emit('channel-created', newChannel);
    callback({ success: true, channel: newChannel });
  });
}