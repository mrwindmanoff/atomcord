import { initSocket, disconnectSocket } from './socket/client.js';
import { LoginPage } from './pages/Login.js';
import { MainApp } from './pages/MainApp.js';
import './style.css';

let currentUser = null;
let socket = null;

function saveUser(user) {
  localStorage.setItem('atomcord_user', JSON.stringify(user));
}

function getSavedUser() {
  const saved = localStorage.getItem('atomcord_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) {
      return null;
    }
  }
  return null;
}

function clearSavedUser() {
  localStorage.removeItem('atomcord_user');
}

function render() {
  const app = document.getElementById('app');
  
  if (!currentUser) {
    LoginPage.render(app, handleAuth);
  } else {
    MainApp.render(app, socket, currentUser, handleLogout);
  }
}

function handleAuth(nickname, password, savedToken, mode = 'login') {
  return new Promise((resolve, reject) => {
    // Если есть сохранённый токен, пробуем восстановить сессию
    if (savedToken) {
      currentUser = { nickname, token: savedToken };
      render();
      resolve();
      return;
    }
    
    // Определяем событие в зависимости от режима
    const eventName = mode === 'login' ? 'login' : 'register';
    
    socket = initSocket(nickname, password, (userData) => {
      currentUser = userData;
      saveUser({ ...userData, password });
      render();
      resolve();
    }, (error) => {
      reject(new Error(error));
    }, eventName);
  });
}

function handleLogout() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  clearSavedUser();
  currentUser = null;
  render();
}

// Запуск
render();