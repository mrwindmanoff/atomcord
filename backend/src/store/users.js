import crypto from 'crypto';

// Хранилище пользователей: id -> { id, nickname, password, token, joinedAt }
const users = new Map();
let nextId = 1;

// Генерация простого токена
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Регистрация
export function registerUser(nickname, password) {
  // Проверяем существует ли пользователь
  for (const user of users.values()) {
    if (user.nickname === nickname) {
      return { success: false, error: 'Пользователь уже существует' };
    }
  }
  
  if (!password || password.length < 4) {
    return { success: false, error: 'Пароль должен быть минимум 4 символа' };
  }
  
  const id = nextId++;
  const token = generateToken();
  
  users.set(id, {
    id,
    nickname,
    password, // В реальном проекте нужно хэшировать!
    token,
    joinedAt: Date.now()
  });
  
  return { 
    success: true, 
    user: { id, nickname, token }
  };
}

// Вход
export function loginUser(nickname, password) {
  for (const user of users.values()) {
    if (user.nickname === nickname && user.password === password) {
      // Обновляем токен при каждом входе
      const newToken = generateToken();
      user.token = newToken;
      
      return { 
        success: true, 
        user: { id: user.id, nickname: user.nickname, token: newToken }
      };
    }
  }
  
  return { success: false, error: 'Неверный никнейм или пароль' };
}

// Получить пользователя по socketId (для обратной совместимости)
export function getUser(socketId) {
  // Временно: ищем по socketId (нужно переделать позже)
  for (const user of users.values()) {
    if (user.socketId === socketId) return user;
  }
  return null;
}

export function addUser(socketId, nickname) {
  // Для обратной совместимости
  const id = nextId++;
  const user = {
    id,
    nickname,
    socketId,
    joinedAt: Date.now()
  };
  users.set(id, user);
  return user;
}

export function removeUser(userId) {
  users.delete(userId);
}

export function getAllUsers() {
  return Array.from(users.values()).map(user => ({
    id: user.id,
    nickname: user.nickname,
    joinedAt: user.joinedAt
  }));
}

export function getUserById(id) {
  return users.get(id);
}