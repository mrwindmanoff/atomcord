// Хранилище голосовых состояний
// voiceChannelId -> Set of socketIds

export const voiceRooms = new Map();

export function joinVoiceChannel(socketId, channelId) {
  if (!voiceRooms.has(channelId)) {
    voiceRooms.set(channelId, new Set());
  }
  voiceRooms.get(channelId).add(socketId);
  return true;
}

export function leaveVoiceChannel(socketId, channelId) {
  const room = voiceRooms.get(channelId);
  if (room) {
    const deleted = room.delete(socketId);
    if (room.size === 0) {
      voiceRooms.delete(channelId);
    }
    return deleted;
  }
  return false;
}

export function getVoiceChannelUsers(channelId) {
  const room = voiceRooms.get(channelId);
  return room ? Array.from(room) : [];
}

export function getUserVoiceChannel(socketId) {
  for (const [channelId, users] of voiceRooms) {
    if (users.has(socketId)) return channelId;
  }
  return null;
}

export function getAllVoiceChannels() {
  const channels = [];
  for (const [channelId, users] of voiceRooms) {
    channels.push({
      channelId,
      userCount: users.size,
      users: Array.from(users)
    });
  }
  return channels;
}

export function isUserInVoice(socketId) {
  return getUserVoiceChannel(socketId) !== null;
}

export function getVoiceChannelUserCount(channelId) {
  const room = voiceRooms.get(channelId);
  return room ? room.size : 0;
}