import { io } from '../server.js';
import { getUser } from '../store/users.js';

// Хранилище серверов и инвайтов
const servers = new Map();
const invites = new Map();
let nextServerId = 1;
let nextChannelId = 1;

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
}

function createServer(name, ownerId) {
  const id = `server_${nextServerId++}`;
  const server = {
    id, name, ownerId,
    channels: [],
    members: new Set([ownerId]),
    createdAt: Date.now()
  };
  server.channels.push({ id: `channel_${nextChannelId++}`, name: 'Общий', type: 'text', serverId: id });
  server.channels.push({ id: `channel_${nextChannelId++}`, name: 'Голосовой штаб', type: 'voice', serverId: id });
  servers.set(id, server);
  return server;
}

function getUserServers(userId) {
  const result = [];
  for (const server of servers.values()) {
    if (server.members.has(userId)) {
      result.push({ id: server.id, name: server.name, channels: server.channels });
    }
  }
  return result;
}

export function handleServers(socket) {
  
  socket.on('create-server', ({ name }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      if (callback) callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    const server = createServer(name, user.id);
    socket.emit('server-created', { id: server.id, name: server.name, channels: server.channels });
    if (callback) callback({ success: true, server: { id: server.id, name: server.name } });
  });
  
  socket.on('get-servers', (callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    const userServers = getUserServers(user.id);
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
    const server = servers.get(serverId);
    if (server && !server.members.has(user.id)) {
      server.members.add(user.id);
    }
    if (server) socket.emit('server-channels', server.channels);
    if (callback) callback({ success: true });
  });
  
  // ПРИСОЕДИНЕНИЕ ПО ИНВАЙТУ
  socket.on('join-server-by-invite', ({ code }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      if (callback) callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    const invite = invites.get(code);
    if (!invite || invite.expiresAt < Date.now()) {
      if (callback) callback({ success: false, error: 'Приглашение недействительно' });
      return;
    }
    const server = servers.get(invite.serverId);
    if (!server) {
      if (callback) callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    if (!server.members.has(user.id)) {
      server.members.add(user.id);
      socket.join(`server:${invite.serverId}`);
    }
    if (callback) callback({ success: true, serverId: invite.serverId, serverName: server.name, channels: server.channels });
  });
  
  // СОЗДАНИЕ ИНВАЙТА
  socket.on('create-invite', ({ serverId, maxUses, expiresInHours }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      if (callback) callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    const server = servers.get(serverId);
    if (!server || server.ownerId !== user.id) {
      if (callback) callback({ success: false, error: 'Только владелец сервера может создавать приглашения' });
      return;
    }
    const code = generateInviteCode();
    const invite = {
      code, serverId,
      maxUses: maxUses || 0,
      uses: 0,
      expiresAt: Date.now() + (expiresInHours || 168) * 60 * 60 * 1000,
      createdAt: Date.now()
    };
    invites.set(code, invite);
    const inviteUrl = `https://atomcord.onrender.com/invite/${code}`;
    if (callback) callback({ success: true, code, inviteUrl });
  });
  
  socket.on('create-channel', ({ serverId, name, type }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    const server = servers.get(serverId);
    if (!server) {
      if (callback) callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    const newChannel = { id: `channel_${nextChannelId++}`, name: name.trim(), type, serverId };
    server.channels.push(newChannel);
    io.to(`server:${serverId}`).emit('channel-created', newChannel);
    if (callback) callback({ success: true, channel: newChannel });
  });
}