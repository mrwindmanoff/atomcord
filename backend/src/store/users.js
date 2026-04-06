export const users = new Map();

export function addUser(socketId, nickname) {
  users.set(socketId, { nickname, joinedAt: Date.now() });
}

export function removeUser(socketId) {
  users.delete(socketId);
}

export function getUser(socketId) {
  return users.get(socketId);
}

export function getAllUsers() {
  return Array.from(users.entries()).map(([id, data]) => ({
    socketId: id,
    nickname: data.nickname
  }));
}