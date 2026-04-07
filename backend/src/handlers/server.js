import { io } from '../server.js';
import { getUser, getUserById } from '../store/users.js';

const servers = new Map();
const invites = new Map();
let nextServerId = 1;
let nextChannelId = 1;

// Хранилище активности пользователей
const userActivity = new Map();

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
    members: new Map(), // userId -> { role, permissions }
    membersList: [],
    createdAt: Date.now()
  };
  
  // Добавляем владельца с полными правами
  server.members.set(ownerId, { 
    role: 'owner', 
    permissions: ['admin', 'manage_channels', 'manage_roles', 'create_invite', 'kick_members', 'ban_members']
  });
  
  server.channels.push({ id: `channel_${nextChannelId++}`, name: 'Общий', type: 'text', serverId: id });
  server.channels.push({ id: `channel_${nextChannelId++}`, name: 'Голосовой штаб', type: 'voice', serverId: id });
  
  servers.set(id, server);
  return server;
}

function getUserServers(userId) {
  const result = [];
  for (const server of servers.values()) {
    if (server.members.has(userId)) {
      const memberInfo = server.members.get(userId);
      result.push({ 
        id: server.id, 
        name: server.name, 
        channels: server.channels,
        members: Array.from(server.members.entries()).map(([uid, data]) => ({ 
          userId: uid, 
          nickname: getUserById(uid)?.nickname || 'Unknown',
          role: data.role,
          permissions: data.permissions
        })),
        myRole: memberInfo.role,
        myPermissions: memberInfo.permissions
      });
    }
  }
  return result;
}

function hasPermission(server, userId, permission) {
  const member = server.members.get(userId);
  if (!member) return false;
  if (member.role === 'owner') return true;
  return member.permissions && member.permissions.includes(permission);
}

export function handleServers(socket) {
  
  socket.on('update-activity', ({ userId }) => {
    if (userId) updateUserActivity(userId);
  });
  
  // Создание сервера
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
      channels: server.channels,
      myRole: 'owner',
      myPermissions: ['admin', 'manage_channels', 'manage_roles', 'create_invite', 'kick_members', 'ban_members']
    });
    if (callback) callback({ success: true, server: { id: server.id, name: server.name } });
  });
  
  // Получение серверов пользователя
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
  
  // Присоединение к серверу
  socket.on('join-server', ({ serverId }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const server = servers.get(serverId);
    if (!server) {
      if (callback) callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    
    socket.join(`server:${serverId}`);
    
    // Если пользователь уже в сервере, просто отправляем данные
    if (server.members.has(user.id)) {
      const memberInfo = server.members.get(user.id);
      socket.emit('server-channels', server.channels);
      socket.emit('server-members', { 
        serverId, 
        members: Array.from(server.members.entries()).map(([uid, data]) => ({
          userId: uid,
          nickname: getUserById(uid)?.nickname || 'Unknown',
          role: data.role,
          permissions: data.permissions
        }))
      });
      if (callback) callback({ success: true, myRole: memberInfo.role, myPermissions: memberInfo.permissions });
      return;
    }
    
    // Новый пользователь получает роль 'member'
    server.members.set(user.id, { 
      role: 'member', 
      permissions: ['view_channels', 'send_messages', 'connect_voice']
    });
    server.membersList.push({ userId: user.id, nickname: user.nickname, role: 'member' });
    
    // Оповещаем всех в сервере об обновлении списка участников
    io.to(`server:${serverId}`).emit('server-members', { 
      serverId, 
      members: Array.from(server.members.entries()).map(([uid, data]) => ({
        userId: uid,
        nickname: getUserById(uid)?.nickname || 'Unknown',
        role: data.role,
        permissions: data.permissions
      }))
    });
    
    socket.emit('server-channels', server.channels);
    if (callback) callback({ success: true, myRole: 'member', myPermissions: ['view_channels', 'send_messages', 'connect_voice'] });
  });
  
  // Присоединение по инвайту
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
    
    socket.join(`server:${invite.serverId}`);
    
    if (!server.members.has(user.id)) {
      server.members.set(user.id, { 
        role: 'member', 
        permissions: ['view_channels', 'send_messages', 'connect_voice']
      });
      io.to(`server:${invite.serverId}`).emit('server-members', { 
        serverId: invite.serverId, 
        members: Array.from(server.members.entries()).map(([uid, data]) => ({
          userId: uid,
          nickname: getUserById(uid)?.nickname || 'Unknown',
          role: data.role,
          permissions: data.permissions
        }))
      });
    }
    
    if (callback) callback({ success: true, serverId: invite.serverId, serverName: server.name, channels: server.channels, myRole: 'member' });
  });
  
  // Создание инвайта (только для owner и admin с правом create_invite)
  socket.on('create-invite', ({ serverId, maxUses, expiresInHours }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      if (callback) callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    const server = servers.get(serverId);
    if (!server) {
      if (callback) callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    
    const hasPerm = hasPermission(server, user.id, 'create_invite');
    if (!hasPerm && server.ownerId !== user.id) {
      if (callback) callback({ success: false, error: 'У вас нет прав на создание приглашений' });
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
  
  // Назначение роли (только для owner)
  socket.on('assign-role', ({ serverId, targetUserId, role, permissions }, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      if (callback) callback({ success: false, error: 'Пользователь не найден' });
      return;
    }
    const server = servers.get(serverId);
    if (!server) {
      if (callback) callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    
    // Только владелец может назначать роли
    if (server.ownerId !== user.id) {
      if (callback) callback({ success: false, error: 'Только владелец сервера может назначать роли' });
      return;
    }
    
    if (!server.members.has(targetUserId)) {
      if (callback) callback({ success: false, error: 'Пользователь не в сервере' });
      return;
    }
    
    let perms = [];
    if (role === 'admin') {
      perms = ['admin', 'manage_channels', 'manage_roles', 'create_invite', 'kick_members', 'ban_members'];
    } else if (role === 'moderator') {
      perms = ['manage_channels', 'create_invite', 'kick_members'];
    } else {
      perms = ['view_channels', 'send_messages', 'connect_voice'];
    }
    
    server.members.set(targetUserId, { role, permissions: perms });
    
    // Оповещаем всех в сервере
    io.to(`server:${serverId}`).emit('server-members', { 
      serverId, 
      members: Array.from(server.members.entries()).map(([uid, data]) => ({
        userId: uid,
        nickname: getUserById(uid)?.nickname || 'Unknown',
        role: data.role,
        permissions: data.permissions
      }))
    });
    
    if (callback) callback({ success: true });
  });
  
  // Создание канала
  socket.on('create-channel', ({ serverId, name, type }, callback) => {
    const user = getUser(socket.id);
    if (!user) return;
    const server = servers.get(serverId);
    if (!server) {
      if (callback) callback({ success: false, error: 'Сервер не найден' });
      return;
    }
    
    const hasPerm = hasPermission(server, user.id, 'manage_channels');
    if (!hasPerm && server.ownerId !== user.id) {
      if (callback) callback({ success: false, error: 'У вас нет прав на создание каналов' });
      return;
    }
    
    const newChannel = { id: `channel_${nextChannelId++}`, name: name.trim(), type, serverId };
    server.channels.push(newChannel);
    io.to(`server:${serverId}`).emit('channel-created', newChannel);
    if (callback) callback({ success: true, channel: newChannel });
  });
  
  // Периодическая проверка статусов
  setInterval(() => {
    for (const [userId, lastActivity] of userActivity) {
      const status = getStatusFromActivity(userId);
      io.emit('user-status-update', { userId, status, lastActivity });
    }
  }, 30000);
}