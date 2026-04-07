import { io } from '../server.js';
import { getUser, getAllUsers } from '../store/users.js';

const servers = new Map();
const invites = new Map();
let nextServerId = 1;
let nextChannelId = 1;

// Хранилище активности пользователей
const userActivity = new Map(); // userId -> lastActivity

function updateUserActivity(userId) {
  userActivity.set(userId, Date.now());
  const status = getStatusFromActivity(userId);
  io.emit('user-status-update', { userId, status, lastActivity: userActivity.get(userId) });
}

function getStatusFromActivity(userId) {
  const last = userActivity.get(userId);
  if (!last) return 'offline';
  const diff = Date.now() - last;
  if (diff < 60000) return 'online';
  if (diff < 600000) return 'away';
  return 'offline';
}

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
}

function createServer(name, ownerId) {
  const id = `server_${nextServerId++}`;
  const server = {
    id, name, ownerId,
    channels: [],
    members: new Set([ownerId]),
    membersList: [{ userId: ownerId, nickname: getUser(ownerId)?.nickname || 'Unknown' }],
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
      result.push({ id: server.id, name: server.name, channels: server.channels, members: Array.from(server.members).map(m => ({ userId: m, nickname: getUser(m)?.nickname || 'Unknown' })) });
    }
  }
  return result;
}

export function handleServers(socket) {
  
  // Обновление активности
  socket.on('update-activity', ({ userId }) => {
    if (userId) updateUserActivity(userId);
  });
  
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
      server.membersList.push({ userId: user.id, nickname: user.nickname });
      // Оповещаем всех в сервере об обновлении списка участников
      io.to(`server:${serverId}`).emit('server-members', { serverId, members: server.membersList });
    }
    if (server) socket.emit('server-channels', server.channels);
    if (callback) callback({ success: true });
  });
  
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
      server.membersList.push({ userId: user.id, nickname: user.nickname });
      io.to(`server:${invite.serverId}`).emit('server-members', { serverId: invite.serverId, members: server.membersList });
      socket.join(`server:${invite.serverId}`);
    }
    if (callback) callback({ success: true, serverId: invite.serverId, serverName: server.name, channels: server.channels });
  });
  
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
  
  // Периодическая проверка статусов (каждые 30 секунд)
  setInterval(() => {
    for (const [userId, lastActivity] of userActivity) {
      const status = getStatusFromActivity(userId);
      io.emit('user-status-update', { userId, status, lastActivity });
    }
  }, 30000);
}