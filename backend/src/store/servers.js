// Хранилище серверов
export const servers = new Map();
export const serverMembers = new Map(); // serverId -> Set of userIds
export const channelPermissions = new Map(); // channelId -> { allow, deny }

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
    createdAt: Date.now()
  };
  
  servers.set(id, server);
  
  // Добавляем владельца в участники
  if (!serverMembers.has(id)) {
    serverMembers.set(id, new Set());
  }
  serverMembers.get(id).add(ownerId);
  
  // Создаём стандартные каналы
  createChannel(id, 'Общий', 'text', ownerId);
  createChannel(id, 'Голосовой штаб', 'voice', ownerId);
  
  return server;
}

// Создание канала внутри сервера
export function createChannel(serverId, name, type, creatorId) {
  const server = servers.get(serverId);
  if (!server) return null;
  
  const id = `channel_${nextChannelId++}`;
  const channel = {
    id,
    name,
    type,
    serverId,
    createdAt: Date.now()
  };
  
  server.channels.push(channel);
  
  // Настройка прав по умолчанию
  channelPermissions.set(id, {
    allow: ['view', 'connect'],
    deny: []
  });
  
  return channel;
}

// Удаление канала
export function deleteChannel(channelId, userId) {
  for (const [serverId, server] of servers) {
    const index = server.channels.findIndex(c => c.id === channelId);
    if (index !== -1) {
      // Проверка прав (только владелец сервера)
      if (server.ownerId !== userId) return false;
      
      server.channels.splice(index, 1);
      channelPermissions.delete(channelId);
      return true;
    }
  }
  return false;
}

// Получить все каналы сервера для пользователя
export function getServerChannels(serverId, userId) {
  const server = servers.get(serverId);
  if (!server) return [];
  
  // Проверяем, есть ли пользователь в сервере
  const members = serverMembers.get(serverId);
  if (!members || !members.has(userId)) return [];
  
  return server.channels;
}

// Получить все сервера пользователя
export function getUserServers(userId) {
  const userServers = [];
  for (const [serverId, members] of serverMembers) {
    if (members.has(userId)) {
      const server = servers.get(serverId);
      if (server) userServers.push(server);
    }
  }
  return userServers;
}

// Добавить пользователя в сервер
export function addUserToServer(serverId, userId) {
  if (!serverMembers.has(serverId)) {
    serverMembers.set(serverId, new Set());
  }
  serverMembers.get(serverId).add(userId);
}

// Удалить пользователя из сервера
export function removeUserFromServer(serverId, userId) {
  const members = serverMembers.get(serverId);
  if (members) {
    members.delete(userId);
  }
}

// Проверить может ли пользователь видеть канал
export function canViewChannel(channelId, userId) {
  // Находим сервер канала
  for (const [serverId, server] of servers) {
    const channel = server.channels.find(c => c.id === channelId);
    if (channel) {
      const members = serverMembers.get(serverId);
      return members && members.has(userId);
    }
  }
  return false;
}