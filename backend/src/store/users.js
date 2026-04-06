// Хранилище пользователей
const usersBySocket = new Map(); // socketId -> { id, nickname }
const usersById = new Map(); // id -> { id, nickname, password }

let nextId = 1;

export function registerUser(nickname, password) {
  // Проверяем существование
  for (const user of usersById.values()) {
    if (user.nickname === nickname) {
      return { success: false, error: 'Пользователь уже существует' };
    }
  }
  
  if (!password || password.length < 4) {
    return { success: false, error: 'Пароль должен быть минимум 4 символа' };
  }
  
  const id = nextId++;
  const user = { id, nickname, password };
  usersById.set(id, user);
  
  return { success: true, user };
}

export function loginUser(nickname, password) {
  for (const user of usersById.values()) {
    if (user.nickname === nickname && user.password === password) {
      return { success: true, user };
    }
  }
  return { success: false, error: 'Неверный никнейм или пароль' };
}

export function addUser(socketId, nickname, userId) {
  const user = usersById.get(userId);
  if (user) {
    usersBySocket.set(socketId, { id: user.id, nickname: user.nickname });
    return user;
  }
  return null;
}

export function getUser(socketId) {
  return usersBySocket.get(socketId);
}

export function removeUser(socketId) {
  usersBySocket.delete(socketId);
}

export function getAllUsers() {
  return Array.from(usersBySocket.values()).map(u => ({
    id: u.id,
    nickname: u.nickname
  }));
}